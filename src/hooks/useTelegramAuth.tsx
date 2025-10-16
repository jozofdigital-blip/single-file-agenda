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

    // Check if running in Telegram Web App and always sign in
    const initTelegramAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (!existingSession) {
          console.log("[TG AUTH] No session, signing in anonymously");
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) {
            console.error("[TG AUTH] signInAnonymously error:", authError);
          } else {
            console.log("[TG AUTH] anonymous signed in", authData.user?.id);
          }
        } else {
          console.log("[TG AUTH] Session exists:", existingSession.user.id);
        }
        
        // If in Telegram WebApp, update profile with Telegram data
        if (window.Telegram?.WebApp) {
          console.log("[TG AUTH] Telegram WebApp detected");
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();
          
          const initData = tg.initDataUnsafe;
          console.log("[TG AUTH] initDataUnsafe.user exists:", Boolean(initData?.user));
          
          if (initData?.user) {
            const telegramUser: TelegramUser = initData.user;
            
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
                console.log("[TG AUTH] profile upserted for", telegramUser.username || telegramUser.first_name);
              }
            }
          }
        } else {
          console.log("[TG AUTH] Not in Telegram WebApp");
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
        expand: () => void;
        initDataUnsafe: {
          user?: TelegramUser;
        };
      };
    };
  }
}
