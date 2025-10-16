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

    // Check if running in Telegram Web App
    const initTelegramAuth = async () => {
      try {
        if (window.Telegram?.WebApp) {
          console.log("[TG AUTH] Telegram WebApp detected");
          const tg = window.Telegram.WebApp;
          tg.ready();
          
          const initData = tg.initDataUnsafe;
          console.log("[TG AUTH] initDataUnsafe.user exists:", Boolean(initData?.user));
          
          if (initData?.user) {
            const telegramUser: TelegramUser = initData.user;
            
            // If already have a session, upsert profile and stop
            const { data: current } = await supabase.auth.getSession();
            if (!current.session) {
              const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
              if (authError) {
                console.error("[TG AUTH] signInAnonymously error:", authError);
              } else {
                console.log("[TG AUTH] anonymous signed in", authData.user?.id);
              }
            }

            const { data: after } = await supabase.auth.getSession();
            if (after.session?.user) {
              const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                  id: after.session.user.id,
                  telegram_id: telegramUser.id,
                  username: telegramUser.username,
                  first_name: telegramUser.first_name,
                  last_name: telegramUser.last_name,
                });
              if (profileError) {
                console.error("[TG AUTH] profile upsert error:", profileError);
              } else {
                console.log("[TG AUTH] profile upserted");
              }
            }
          }
        } else {
          console.log("[TG AUTH] Not in Telegram, checking existing session");
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("[TG AUTH] init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initTelegramAuth();

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
};

// Type declaration for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        initDataUnsafe: {
          user?: TelegramUser;
        };
      };
    };
  }
}
