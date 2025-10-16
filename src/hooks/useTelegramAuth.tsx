import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseSafe";
import { Session, User } from "@supabase/supabase-js";

interface TelegramUser {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

type CompleteResult = { ok: true } | { ok: false; error: string };

type VerifyTelegramResponse = {
  ok?: boolean;
  error?: string;
  session?: Session | null;
  user?: Partial<TelegramUser> | null;
} | null;

const normalizeTelegramUser = (
  candidate: Partial<TelegramUser> | TelegramUser | null | undefined,
  fallbackId: string,
): TelegramUser | null => {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const rawId = record.id ?? (record as Record<string, unknown>).telegram_id ?? fallbackId;
  const idValue = typeof rawId === "number" || typeof rawId === "string" ? rawId : fallbackId;

  const username = typeof record.username === "string" ? record.username : undefined;
  const firstName = typeof record.first_name === "string" ? record.first_name : undefined;
  const lastName = typeof record.last_name === "string" ? record.last_name : undefined;

  return {
    id: idValue,
    username,
    first_name: firstName,
    last_name: lastName,
  };
};

const extractFunctionsErrorMessage = async (error: unknown): Promise<string | undefined> => {
  if (!error || typeof error !== "object") return undefined;
  const maybeError = error as { message?: string; context?: Record<string, unknown> };
  const context = maybeError.context ?? {};

  const candidates: Array<unknown> = [];
  if ("error" in context) candidates.push(context.error);
  if ("body" in context) candidates.push(context.body);

  if ("response" in context && typeof context.response === "object" && context.response !== null) {
    const response = context.response as { clone?: () => Response } & Response;
    try {
      const clone = typeof response.clone === "function" ? response.clone() : response;
      const data = await clone.json();
      candidates.push(data);
    } catch (err) {
      if (err instanceof Error && err.message === "body used already for fetch") {
        // Body already consumed – fall back to other hints below.
      }
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as any).error === "string") {
          return (parsed as any).error as string;
        }
      } catch (_error) {
        return candidate;
      }
    }

    if (typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      const message = record.error ?? record.message ?? record.detail;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }

  return maybeError.message;
};

export const useTelegramAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  const ensureProfile = async (userId: string, tgUser?: TelegramUser | null) => {
    try {
      setProfileReady(false);
      const supabase = await getSupabase();

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('telegram_id')
        .eq('id', userId)
        .maybeSingle();

      // Build update payload - only include telegram fields if tgUser is provided
      const payload: {
        id: string;
        telegram_id?: number;
        username?: string;
        first_name?: string;
        last_name?: string;
      } = { id: userId };
      if (tgUser) {
        const numericId = typeof tgUser.id === 'number' ? tgUser.id : Number(tgUser.id);
        if (!Number.isNaN(numericId)) {
          payload.telegram_id = numericId;
        }
        if (tgUser.username !== undefined) payload.username = tgUser.username;
        if (tgUser.first_name !== undefined) payload.first_name = tgUser.first_name;
        if (tgUser.last_name !== undefined) payload.last_name = tgUser.last_name;
        console.log('[TG AUTH] Updating profile with telegram data:', {
          id: tgUser.id,
          username: tgUser.username,
        });
      } else if (!existingProfile) {
        console.log('[TG AUTH] Creating empty profile for user:', userId);
      } else {
        console.log('[TG AUTH] Profile exists, no telegram data to update');
        setProfileReady(true);
        return true;
      }

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) {
        console.error('[TG AUTH] ensureProfile upsert error:', error);
        return false;
      }

      setProfileReady(true);
      return true;
    } catch (e) {
      console.error('[TG AUTH] ensureProfile error:', e);
      return false;
    }
  };

  const applyVerifyResponse = async (
    verifyResp: VerifyTelegramResponse,
    supabase: Awaited<ReturnType<typeof getSupabase>>,
    telegramUserOverride?: TelegramUser | null,
  ): Promise<CompleteResult> => {
    if (!verifyResp?.ok || !verifyResp.session) {
      const message = verifyResp?.error ?? 'Не удалось получить сессию Supabase';
      return { ok: false, error: message };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: verifyResp.session.access_token,
      refresh_token: verifyResp.session.refresh_token,
    });

    if (sessionError) {
      return { ok: false, error: sessionError.message };
    }

    const sessionUserId = verifyResp.session.user?.id;
    if (sessionUserId) {
      const normalizedTelegram = telegramUserOverride
        ?? normalizeTelegramUser(verifyResp.user ?? null, sessionUserId);

      await ensureProfile(sessionUserId, normalizedTelegram);
    }

    console.log('[TG AUTH] Session applied successfully');
    return { ok: true };
  };

  const signInWithTelegram = async () => {
    try {
      const supabase = await getSupabase();
      const isInTelegram = window.Telegram?.WebApp;

      if (!isInTelegram) {
        console.log('[TG AUTH] Not in Telegram WebApp');
        return;
      }

      console.log('[TG AUTH] Telegram WebApp detected');
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const initData = tg.initDataUnsafe;
      const initDataString = tg.initData;
      console.log("[TG AUTH] initDataUnsafe.user exists:", Boolean(initData?.user), "initData length:", initDataString?.length || 0);

      if (!initDataString) {
        console.error('[TG AUTH] No initData available');
        return;
      }

      console.log('[TG AUTH] Calling verify-telegram edge function...');
      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'webapp', initData: initDataString },
      });

      if (verifyErr || !verifyResp?.ok) {
        const details = verifyErr ? await extractFunctionsErrorMessage(verifyErr) : verifyResp?.error;
        console.error('[TG AUTH] verify-telegram failed', { error: verifyErr, response: verifyResp, details });
        return;
      }

      console.log('[TG AUTH] verify-telegram response:', { ok: verifyResp.ok, hasSession: !!verifyResp.session });

      if (verifyResp.session) {
        // Set session from backend
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: verifyResp.session.access_token,
          refresh_token: verifyResp.session.refresh_token,
        });

        if (sessionError) {
          console.error('[TG AUTH] setSession error:', sessionError);
          return;
        }

        const sessionUserId = verifyResp.session.user?.id;
        if (sessionUserId) {
          await ensureProfile(sessionUserId, initData?.user ?? null);
        }

        console.log('[TG AUTH] Session set successfully');
      } else {
        console.error('[TG AUTH] No session in response');
      }
    } catch (error) {
      console.error('[TG AUTH] signInWithTelegram error:', error);
    }
  };

  const completeLoginWithToken = async (token: string): Promise<CompleteResult> => {
    try {
      const supabase = await getSupabase();
      setLoading(true);

      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'token', token },
      });

      if (verifyErr) {
        const message = await extractFunctionsErrorMessage(verifyErr);
        console.error('[TG AUTH] token verify error:', verifyErr, message);
        return { ok: false, error: message ?? verifyErr.message ?? 'Не удалось проверить токен' };
      }

      const result = await applyVerifyResponse(verifyResp ?? null, supabase);
      if (!result.ok) {
        console.error('[TG AUTH] token flow failed to apply session:', result.error);
      }

      return result;
    } catch (e) {
      console.error('[TG AUTH] completeLoginWithToken error:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Неизвестная ошибка' };
    } finally {
      setLoading(false);
    }
  };

  const completeLoginWithLoginPayload = async (payload: Record<string, unknown>): Promise<CompleteResult> => {
    try {
      const supabase = await getSupabase();
      setLoading(true);

      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'login_url', payload },
      });

      if (verifyErr) {
        const message = await extractFunctionsErrorMessage(verifyErr);
        console.error('[TG AUTH] login_url verify error:', verifyErr, message);
        return { ok: false, error: message ?? verifyErr.message ?? 'Не удалось подтвердить данные Telegram' };
      }

      const result = await applyVerifyResponse(verifyResp ?? null, supabase);
      if (!result.ok) {
        console.error('[TG AUTH] login_url session application failed:', result.error);
      }

      return result;
    } catch (e) {
      console.error('[TG AUTH] completeLoginWithLoginPayload error:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Неизвестная ошибка' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[TG AUTH] init');
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const supabase = await getSupabase();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          console.log('[TG AUTH] onAuthStateChange', event, Boolean(nextSession));
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
          if (nextSession?.user) {
            const sessionUser = nextSession.user;
            if (sessionUser) {
              setTimeout(() => {
                ensureProfile(sessionUser.id);
              }, 0);
            }
          } else {
            setProfileReady(false);
          }
        });
        unsubscribe = () => subscription.unsubscribe();

        try {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            console.log('[TG AUTH] Session exists:', existingSession.user.id);
            await ensureProfile(existingSession.user.id);
          } else {
            console.log('[TG AUTH] No session found');
          }
        } catch (error) {
          console.error('[TG AUTH] init error:', error);
        } finally {
          setLoading(false);
        }
      } catch (e) {
        console.error('[TG AUTH] supabase init failed', e);
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const linkTelegramFromBrowser = async (payload: TelegramUser) => {
    try {
      const supabase = await getSupabase();
      console.log('[TG AUTH] Browser widget auth, payload:', { id: payload?.id, username: payload?.username });

      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'widget', payload },
      });

      if (verifyErr) {
        const message = await extractFunctionsErrorMessage(verifyErr);
        console.error('[TG AUTH] widget verify error:', verifyErr, message);
        return;
      }

      console.log('[TG AUTH] widget verify response:', { ok: verifyResp?.ok, hasSession: !!verifyResp?.session });

      if (verifyResp.session) {
        // Set session from backend
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: verifyResp.session.access_token,
          refresh_token: verifyResp.session.refresh_token,
        });

        if (sessionError) {
          console.error('[TG AUTH] setSession error:', sessionError);
          return;
        }

        console.log('[TG AUTH] Browser session set successfully');

        const sessionUserId = verifyResp.session.user?.id;
        if (sessionUserId) {
          await ensureProfile(sessionUserId, verifyResp.user ?? null);
        }
      } else {
        console.error('[TG AUTH] No session in widget response');
      }
    } catch (e) {
      console.error('[TG AUTH] linkTelegramFromBrowser error', e);
    }
  };

  return { user, session, loading, profileReady, signInWithTelegram, linkTelegramFromBrowser, completeLoginWithToken };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe: {
          user?: TelegramUser;
        };
        initData?: string;
      };
    };
  }
}
