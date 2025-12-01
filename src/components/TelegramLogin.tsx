import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type ImportMetaEnv = { env?: Record<string, string | undefined> };

const RAW_BOT = (import.meta as unknown as ImportMetaEnv).env?.VITE_TELEGRAM_BOT_USERNAME ?? "my_helpday_bot";
const BOT_USERNAME = String(RAW_BOT).replace(/^@/, "");

interface TelegramLoginProps {
  onLogin: () => void;
  onBrowserAuth: (user: any) => void;
  isInTelegram: boolean;
  variant?: "full" | "inline";
}

export const TelegramLogin = ({ onLogin, onBrowserAuth, isInTelegram, variant = "full" }: TelegramLoginProps) => {
  const loginUrl = `https://t.me/${BOT_USERNAME}?start=login`;
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isInTelegram || !widgetRef.current) return;

    // Define callback globally
    (window as any).onTelegramAuth = (user: any) => {
      console.log('[TelegramLogin] Widget auth callback', user);
      onBrowserAuth(user);
    };

    // Load Telegram Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    widgetRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [isInTelegram, onBrowserAuth]);

  const handleLoginClick = () => {
    if (isInTelegram) {
      onLogin();
    } else {
      const opened = window.open(loginUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = loginUrl;
      }
    }
  };


  if (variant === "inline") {
    return (
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex w-full items-center justify-between gap-3 md:mx-auto md:max-w-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              {isInTelegram 
                ? "Войдите через Telegram, чтобы добавлять задачи"
                : "Нажмите кнопку — откроется Telegram-бот. После получения ссылки вернитесь сюда."
              }
            </p>
          </div>
          <Button onClick={handleLoginClick} className="h-10 shrink-0 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300">
            Войти через Telegram
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
            Ежедневник Задач
          </h1>
          <p className="text-muted-foreground">Простой и удобный планировщик для ваших задач</p>
        </div>

        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 mb-2 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              {isInTelegram
                ? "Нажмите кнопку ниже, чтобы войти через Telegram"
                : "Войдите через Telegram одним нажатием"
              }
            </p>
            {!isInTelegram && (
              <>
                <div ref={widgetRef} className="flex justify-center mb-3" />
                <Button
                  onClick={handleLoginClick}
                  className="w-full h-11 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300"
                >
                  Открыть Telegram-бота
                </Button>
              </>
            )}
          </div>
          {isInTelegram && (
            <Button onClick={handleLoginClick} className="w-full h-12 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
              </svg>
              Войти через Telegram
            </Button>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Ваши данные надежно хранятся и защищены
        </div>
      </Card>
    </div>
  );
};

