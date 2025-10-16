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

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const bytes = base64UrlToUint8Array(part);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

async function verifyJwtHS256(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtPart(headerB64);
  if (header.alg !== "HS256") {
    throw new Error("Unsupported JWT algorithm");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signedContent = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const valid = await crypto.subtle.verify("HMAC", key, signature, signedContent);

  if (!valid) {
    throw new Error("Invalid JWT signature");
  }

  return decodeJwtPart(payloadB64);
}

function tryParseObjectString(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string") return null;
  const attempts = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) {
      attempts.push(decoded);
    }
  } catch (_error) {
    // ignore decodeURIComponent failures
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch (_error) {
      continue;
    }
  }

  return null;
}

function normalizeLoginPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Login payload must be an object");
  }

  const source = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...source };

  const rawAuthResult = typeof normalized["tgAuthResult"] === "string"
    ? normalized["tgAuthResult"] as string
    : typeof normalized["tg_auth_result"] === "string"
      ? normalized["tg_auth_result"] as string
      : null;

  if (rawAuthResult) {
    const parsedAuth = tryParseObjectString(rawAuthResult);
    if (parsedAuth) {
      Object.assign(normalized, parsedAuth);
    }
  }

  delete normalized["tgAuthResult"];
  delete normalized["tg_auth_result"];

  if (typeof normalized["user"] === "string") {
    const parsedUser = tryParseObjectString(normalized["user"]);
    if (parsedUser) {
      normalized["user"] = parsedUser;
    }
  }

  return normalized;
}

interface TelegramUserPayload {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

async function ensureUserAndSession(
  supabase: ReturnType<typeof createClient>,
  telegramUser: TelegramUserPayload,
  botToken: string,
) {
  const telegramId = telegramUser.id;
  const email = `tg_${telegramId}@telegram.local`;
  const password = await sha256Hex(`${telegramId}_${botToken}`);

  const profileUpdate: Record<string, unknown> = { telegram_id: telegramId };
  if (telegramUser.username !== undefined) profileUpdate.username = telegramUser.username;
  if (telegramUser.first_name !== undefined) profileUpdate.first_name = telegramUser.first_name;
  if (telegramUser.last_name !== undefined) profileUpdate.last_name = telegramUser.last_name;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.id as string;
    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (updateError) {
      console.error("[TG] Failed to update profile:", updateError);
    }
  } else {
    const userMetadata = {
      telegram_id: telegramId,
      ...(telegramUser.username !== undefined ? { username: telegramUser.username } : {}),
      ...(telegramUser.first_name !== undefined ? { first_name: telegramUser.first_name } : {}),
      ...(telegramUser.last_name !== undefined ? { last_name: telegramUser.last_name } : {}),
    };

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (authError || !authData?.user) {
      throw new Error("Failed to create user");
    }

    userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      ...profileUpdate,
    });

    if (profileError) {
      console.error("[TG] Failed to create profile:", profileError);
    }
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError || !sessionData?.session) {
    throw new Error("Failed to create session");
  }

  return {
    session: sessionData.session,
    userId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, payload, initData, token } = await req.json() as {
      type?: string;
      payload?: unknown;
      initData?: unknown;
      token?: unknown;
    };
    console.log("[TG] Request received, type:", type);

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let telegramUser: TelegramUserPayload | null = null;

    if (type === "widget" || type === "webapp" || type === "login_url") {
      const secretKey = await sha256Hex(botToken);
      let dataForCheck: Record<string, unknown>;

      if (type === "webapp") {
        if (!initData || typeof initData !== "string") {
          return new Response(JSON.stringify({ error: "initData is required for webapp" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        dataForCheck = parseQueryString(initData);
      } else {
        if (!payload || typeof payload !== "object") {
          return new Response(JSON.stringify({ error: "payload is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        dataForCheck = normalizeLoginPayload(payload);
      }

      const rawHash = dataForCheck["hash"];
      const providedHash = typeof rawHash === "string"
        ? rawHash
        : rawHash
          ? String(rawHash)
          : "";
      if (!providedHash) {
        return new Response(JSON.stringify({ error: "Missing hash" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const dataCheckString = buildDataCheckString(dataForCheck);
      const calcHash = await hmacSha256Hex(secretKey, dataCheckString);

      if (calcHash !== providedHash) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (type === "webapp") {
        const parsed = dataForCheck as Record<string, string>;
        let parsedUser: Record<string, unknown> | null = null;
        try {
          parsedUser = parsed.user ? JSON.parse(parsed.user) : null;
        } catch (_e) {
          parsedUser = null;
        }

        if (!parsedUser || parsedUser.id === undefined) {
          return new Response(JSON.stringify({ error: "No user data in Telegram response" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        telegramUser = {
          id: String(parsedUser.id),
          username: typeof parsedUser.username === "string" ? parsedUser.username : undefined,
          first_name: typeof parsedUser.first_name === "string" ? parsedUser.first_name : undefined,
          last_name: typeof parsedUser.last_name === "string" ? parsedUser.last_name : undefined,
        };
      } else {
        const userSource = typeof dataForCheck.user === "object" && dataForCheck.user !== null
          ? dataForCheck.user as Record<string, unknown>
          : dataForCheck;

        const idCandidate = userSource.id ?? dataForCheck.id;
        if (idCandidate === undefined) {
          return new Response(JSON.stringify({ error: "No user data in Telegram response" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        telegramUser = {
          id: String(idCandidate),
          username: typeof userSource.username === "string"
            ? userSource.username
            : typeof dataForCheck.username === "string"
              ? dataForCheck.username as string
              : undefined,
          first_name: typeof userSource.first_name === "string"
            ? userSource.first_name
            : typeof dataForCheck.first_name === "string"
              ? dataForCheck.first_name as string
              : undefined,
          last_name: typeof userSource.last_name === "string"
            ? userSource.last_name
            : typeof dataForCheck.last_name === "string"
              ? dataForCheck.last_name as string
              : undefined,
        };
      }
    } else if (type === "token") {
      const loginSecret = Deno.env.get("TELEGRAM_LOGIN_JWT_SECRET") ?? botToken;
      const payloadString = typeof payload === "string" ? payload : undefined;
      const payloadObject = typeof payload === "object" && payload !== null
        ? payload as Record<string, unknown>
        : undefined;

      const rawToken = typeof token === "string"
        ? token
        : payloadString
          ? payloadString
          : typeof payloadObject?.token === "string"
            ? String(payloadObject.token)
            : undefined;

      if (!rawToken) {
        return new Response(JSON.stringify({ error: "Token is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let decodedPayload: Record<string, unknown>;
      try {
        decodedPayload = await verifyJwtHS256(rawToken, loginSecret);
      } catch (error) {
        console.error("[TG] Token verification failed:", error);
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const exp = typeof decodedPayload.exp === "number" ? decodedPayload.exp : null;
      if (exp && exp * 1000 < Date.now()) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extra = (typeof decodedPayload.extra === "object" && decodedPayload.extra !== null)
        ? decodedPayload.extra as Record<string, unknown>
        : {};

      const idSource = decodedPayload.sub
        ?? (decodedPayload as Record<string, unknown>).telegram_id
        ?? extra.telegram_id
        ?? extra.id;

      if (idSource === undefined || idSource === null) {
        return new Response(JSON.stringify({ error: "Token is missing telegram_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      telegramUser = {
        id: String(idSource),
        username: typeof decodedPayload.username === "string"
          ? decodedPayload.username
          : typeof extra.username === "string"
            ? extra.username
            : undefined,
        first_name: typeof decodedPayload.first_name === "string"
          ? decodedPayload.first_name
          : typeof extra.first_name === "string"
            ? extra.first_name
            : undefined,
        last_name: typeof decodedPayload.last_name === "string"
          ? decodedPayload.last_name
          : typeof extra.last_name === "string"
            ? extra.last_name
            : undefined,
      };
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!telegramUser || !telegramUser.id) {
      return new Response(JSON.stringify({ error: "Telegram user is not defined" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedId = Number(telegramUser.id);
    const responseUser = {
      id: Number.isNaN(normalizedId) ? telegramUser.id : normalizedId,
      username: telegramUser.username ?? null,
      first_name: telegramUser.first_name ?? null,
      last_name: telegramUser.last_name ?? null,
    };

    const { session } = await ensureUserAndSession(supabase, telegramUser, botToken);

    return new Response(JSON.stringify({
      ok: true,
      user: responseUser,
      session,
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
