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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check if running in Telegram Web App
    const initTelegramAuth = async () => {
      try {
        // Check if Telegram WebApp is available
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          
          const initData = tg.initDataUnsafe;
          
          if (initData?.user) {
            const telegramUser: TelegramUser = initData.user;
            
            // Sign in anonymously first to get a user ID
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
            
            if (authError) {
              console.error("Auth error:", authError);
              setLoading(false);
              return;
            }

            if (authData.user) {
              // Create or update profile with Telegram data
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
                console.error("Profile error:", profileError);
              }
            }
          }
        } else {
          // If not in Telegram, check for existing session
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Telegram auth error:", error);
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
