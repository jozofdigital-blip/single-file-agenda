import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const signInWithTelegram = async () => {
    try {
      const isInTelegram = window.Telegram?.WebApp;
      
      // Sign in anonymously first
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        console.error("[TG AUTH] signInAnonymously error:", authError);
        return;
      }
      
      console.log("[TG AUTH] anonymous signed in", authData.user?.id);
      
      // If in Telegram WebApp, also update profile with Telegram data
      if (isInTelegram) {
        console.log("[TG AUTH] Telegram WebApp detected");
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const initData = tg.initDataUnsafe;
        const initDataString = (tg as any).initData as string | undefined;
        console.log("[TG AUTH] initDataUnsafe.user exists:", Boolean(initData?.user));

        // Verify on backend
        if (initDataString) {
          const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
            body: { type: 'webapp', initData: initDataString },
          });
          if (verifyErr || !verifyResp?.ok) {
            console.error('[TG AUTH] verify-telegram failed', verifyErr || verifyResp);
            return;
          }
        }
        
        if (initData?.user) {
          const telegramUser: TelegramUser = initData.user;
          
          // Update profile with Telegram data
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: authData.user.id,
              telegram_id: telegramUser.id,
              username: telegramUser.username,
              first_name: telegramUser.first_name,
              last_name: telegramUser.last_name,
            });
            
          if (profileError) {
            console.error("[TG AUTH] profile upsert error:", profileError);
          } else {
            console.log("[TG AUTH] profile upserted for", telegramUser.username || telegramUser.first_name);
          }
        }
      } else {
        console.log("[TG AUTH] Not in Telegram WebApp, signed in anonymously");
      }
    } catch (error) {
      console.error("[TG AUTH] signInWithTelegram error:", error);
    }
  };

  useEffect(() => {
    console.log("[TG AUTH] init");
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[TG AUTH] onAuthStateChange", event, Boolean(session));
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session and Telegram WebApp
    const initTelegramAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log("[TG AUTH] Session exists:", existingSession.user.id);
          setLoading(false);
          return;
        }
        
        console.log("[TG AUTH] No session found");
      } catch (error) {
        console.error("[TG AUTH] init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initTelegramAuth();

    return () => subscription.unsubscribe();
  }, []);

  const linkTelegramFromBrowser = async (payload: any) => {
    try {
      // Verify via edge function
      const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke('verify-telegram', {
        body: { type: 'widget', payload },
      });
      if (verifyErr || !verifyResp?.ok) {
        console.error('[TG AUTH] widget verify failed', verifyErr || verifyResp);
        return;
      }

      const { data: existing } = await supabase.auth.getSession();
      if (!existing.session) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          console.error('[TG AUTH] anon sign-in error', authError);
          return;
        }
        existing.session = { ...existing.session, user: authData.user } as any;
      }

      const u = verifyResp.user || payload;
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: existing.session!.user.id,
          telegram_id: u.id,
          username: u.username,
          first_name: u.first_name,
          last_name: u.last_name,
        });
      if (profileError) console.error('[TG AUTH] profile upsert error', profileError);
    } catch (e) {
      console.error('[TG AUTH] linkTelegramFromBrowser error', e);
    }
  };

  return { user, session, loading, signInWithTelegram, linkTelegramFromBrowser };
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
