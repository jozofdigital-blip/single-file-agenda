import { useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type ImportMetaEnv = { env?: Record<string, string | undefined> };
type TelegramWidgetPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
  hash: string;
};

const RAW_BOT = (import.meta as unknown as ImportMetaEnv).env?.VITE_TELEGRAM_BOT_USERNAME ?? "my_helpday_bot";
const BOT_USERNAME = String(RAW_BOT).replace(/^@/, "");

interface TelegramLoginProps {
  onLogin: () => void;
  onOAuth: (payload: TelegramWidgetPayload) => void;
  isInTelegram: boolean;
  variant?: "full" | "inline";
}

export const TelegramLogin = ({ onLogin, onOAuth, isInTelegram, variant = "full" }: TelegramLoginProps) => {
  const loginUrl = `https://t.me/${BOT_USERNAME}?start=login`;

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

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const payload = event.detail as TelegramWidgetPayload;
      onOAuth(payload);
    };
    window.addEventListener("tg-oauth", handler as EventListener);

    // Load Telegram Login Widget for browser (not WebApp)
    let scriptEl: HTMLScriptElement | null = null;
    if (!isInTelegram) {
      window.onTelegramAuth = function (user: TelegramWidgetPayload) {
        window.dispatchEvent(new CustomEvent("tg-oauth", { detail: user }));
      };

      const container = document.getElementById("tg-login-widget");
      if (container && !container.querySelector('script[data-loaded="true"]')) {
        scriptEl = document.createElement("script");
        scriptEl.async = true;
        scriptEl.src = "https://telegram.org/js/telegram-widget.js?22";
        scriptEl.setAttribute("data-loaded", "true");
        scriptEl.setAttribute("data-telegram-login", BOT_USERNAME);
        scriptEl.setAttribute("data-size", "large");
        scriptEl.setAttribute("data-userpic", "false");
        scriptEl.setAttribute("data-request-access", "write");
        scriptEl.setAttribute("data-onauth", "onTelegramAuth");
        console.log("[TG Widget] Injected for bot:", BOT_USERNAME);
        container.appendChild(scriptEl);
      }
    }

    return () => {
      window.removeEventListener("tg-oauth", handler as EventListener);
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
      window.onTelegramAuth = undefined;
    };
  }, [onOAuth, isInTelegram]);

  if (variant === "inline") {
    return (
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex w-full items-center justify-between gap-3 md:mx-auto md:max-w-2xl">
          <div className="flex-1 min-w-0">
            {isInTelegram ? (
              <p className="text-sm text-muted-foreground">Войдите через Telegram, чтобы добавлять задачи</p>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Нажмите кнопку — откроется Telegram-бот. После получения ссылки вернитесь сюда.
                </p>
                <div id="tg-login-widget" className="flex justify-start" />
              </div>
            )}
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
          {isInTelegram ? (
            <p className="text-center text-sm text-muted-foreground">Нажмите кнопку ниже, чтобы войти через Telegram</p>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-4 mb-2 space-y-2">
              <p className="text-sm text-muted-foreground">
                После нажатия кнопки откроется Telegram-бот. Нажмите «Start» и переходите по ссылке, которую он пришлёт.
              </p>
              <div id="tg-login-widget" className="flex justify-center" />
              <a
                href={loginUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-center text-primary underline"
              >
                Открыть бота вручную
              </a>
            </div>
          )}
          <Button onClick={handleLoginClick} className="w-full h-12 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300">
            {isInTelegram ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
                Войти через Telegram
              </>
            ) : (
              "Открыть Telegram-бота"
            )}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Ваши данные надежно хранятся и защищены
        </div>
      </Card>
    </div>
  );
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetPayload) => void;
  }
}
