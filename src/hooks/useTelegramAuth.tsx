import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseSafe";
import { Session, User } from "@supabase/supabase-js";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

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
        payload.telegram_id = tgUser.id;
        payload.username = tgUser.username;
        payload.first_name = tgUser.first_name;
        payload.last_name = tgUser.last_name;
        console.log('[TG AUTH] Updating profile with telegram data:', { id: tgUser.id, username: tgUser.username });
      } else if (!existingProfile) {
        // Only set empty profile if it doesn't exist
        console.log('[TG AUTH] Creating empty profile for user:', userId);
      } else {
        // Profile exists and no tgUser data - skip update to preserve telegram_id
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

  const signInWithTelegram = async () => {
    try {
      const supabase = await getSupabase();
      const isInTelegram = window.Telegram?.WebApp;

      if (!isInTelegram) {
        console.log("[TG AUTH] Not in Telegram WebApp");
        return;
      }

      console.log("[TG AUTH] Telegram WebApp detected");
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

      // Verify on backend and get session
      console.log("[TG AUTH] Calling verify-telegram edge function...");
      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'webapp', initData: initDataString },
      });
      
      if (verifyErr || !verifyResp?.ok) {
        console.error('[TG AUTH] verify-telegram failed', { error: verifyErr, response: verifyResp });
        return;
      }

      console.log("[TG AUTH] verify-telegram response:", { ok: verifyResp.ok, hasSession: !!verifyResp.session });

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
      console.error("[TG AUTH] signInWithTelegram error:", error);
    }
  };

  const completeLoginWithToken = async (token: string) => {
    try {
      const supabase = await getSupabase();
      setLoading(true);

      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'token', token },
      });

      if (verifyErr) {
        console.error('[TG AUTH] token verify error:', verifyErr);
        return { ok: false, error: verifyErr.message ?? 'Не удалось проверить токен' };
      }

      if (!verifyResp?.ok || !verifyResp.session) {
        console.error('[TG AUTH] token verify failed:', verifyResp);
        return { ok: false, error: verifyResp?.error ?? 'Неверный токен входа' };
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: verifyResp.session.access_token,
        refresh_token: verifyResp.session.refresh_token,
      });

      if (sessionError) {
        console.error('[TG AUTH] setSession error (token flow):', sessionError);
        return { ok: false, error: sessionError.message };
      }

      const sessionUserId = verifyResp.session.user?.id;
      if (sessionUserId) {
        await ensureProfile(sessionUserId, verifyResp.user ?? null);
      }

      console.log('[TG AUTH] Session set via token successfully');
      return { ok: true };
    } catch (e) {
      console.error('[TG AUTH] completeLoginWithToken error:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Неизвестная ошибка' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[TG AUTH] init");
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const supabase = await getSupabase();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log("[TG AUTH] onAuthStateChange", event, Boolean(session));
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
              setTimeout(() => {
                ensureProfile(session.user.id);
              }, 0);
            } else {
              setProfileReady(false);
            }
          }
        );
        unsubscribe = () => subscription.unsubscribe();

        // Check for existing session
        try {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            console.log("[TG AUTH] Session exists:", existingSession.user.id);
            await ensureProfile(existingSession.user.id);
          } else {
            console.log("[TG AUTH] No session found");
          }
        } catch (error) {
          console.error("[TG AUTH] init error:", error);
        } finally {
          setLoading(false);
        }
      } catch (e) {
        console.error("[TG AUTH] supabase init failed", e);
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
      
      // Verify via edge function and get session
      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'widget', payload },
      });
      
      if (verifyErr) {
        console.error('[TG AUTH] widget verify error:', verifyErr);
        return;
      }

      console.log('[TG AUTH] widget verify response:', { ok: verifyResp?.ok, hasSession: !!verifyResp?.session });
      
      if (!verifyResp?.ok) {
        console.error('[TG AUTH] widget verify failed:', verifyResp);
        return;
      }

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

// Type declaration for Telegram WebApp
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
