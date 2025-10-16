import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    return new Response(JSON.stringify({ ok: true, user }), {
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
