import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(keyHex: string, data: string): Promise<string> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildDataCheckString(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
    .filter(([k, v]) => k !== "hash" && v !== undefined && v !== null)
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)] as [string, string])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`);
  return entries.join("\n");
}

function parseQueryString(qs: string): Record<string, string> {
  const urlParams = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  const obj: Record<string, string> = {};
  for (const [k, v] of urlParams.entries()) obj[k] = v;
  return obj;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, payload, initData } = await req.json();
    console.log("[TG] Request received, type:", type);
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secretKey = await sha256Hex(botToken);

    let dataForCheck: Record<string, unknown>;

    if (type === "widget") {
      // payload is the user object from Telegram Login Widget
      dataForCheck = payload as Record<string, unknown>;
    } else if (type === "webapp") {
      if (!initData || typeof initData !== "string") {
        return new Response(JSON.stringify({ error: "initData is required for webapp" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      dataForCheck = parseQueryString(initData);
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const providedHash = String((dataForCheck as any).hash || "");
    if (!providedHash) {
      return new Response(JSON.stringify({ error: "Missing hash" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dataCheckString = buildDataCheckString(dataForCheck);
    const calcHash = await hmacSha256Hex(secretKey, dataCheckString);

    if (calcHash !== providedHash) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract user
    let user: any = null;
    if (type === "widget") {
      user = payload;
    } else if (type === "webapp") {
      const parsed = dataForCheck as Record<string, string>;
      try {
        user = parsed.user ? JSON.parse(parsed.user) : null;
      } catch {
        user = null;
      }
    }

    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "No user data in Telegram response" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find or create user by telegram_id
    const telegramId = user.id;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // User exists
      userId = existingProfile.id;
      console.log("[TG] Existing user found:", userId, "telegram_id:", telegramId);
      
      // Update profile with latest Telegram data
      const { error: updateError } = await supabase.from("profiles").update({
        telegram_id: telegramId,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      }).eq("id", userId);
      
      if (updateError) {
        console.error("[TG] Failed to update profile:", updateError);
      } else {
        console.log("[TG] Profile updated with telegram_id:", telegramId);
      }
    } else {
      // Create new user
      const email = `tg_${telegramId}@telegram.local`;
      const password = await sha256Hex(`${telegramId}_${botToken}`);

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        },
      });

      if (authError || !authData.user) {
        console.error("[TG] Failed to create user:", authError);
        return new Response(JSON.stringify({ error: "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = authData.user.id;
      console.log("[TG] New user created:", userId);

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        telegram_id: telegramId,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      });
      
      if (profileError) {
        console.error("[TG] Failed to create profile:", profileError);
      } else {
        console.log("[TG] Profile created with telegram_id:", telegramId);
      }
    }

    // Generate session token for client
    const email = `tg_${telegramId}@telegram.local`;
    const password = await sha256Hex(`${telegramId}_${botToken}`);

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      console.error("[TG] Failed to create session:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      user,
      session: sessionData.session,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-telegram error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
