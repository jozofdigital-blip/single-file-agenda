import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

type ImportMetaEnv = { env?: Record<string, string | undefined> };

const RAW_BOT = (import.meta as unknown as ImportMetaEnv).env?.VITE_TELEGRAM_BOT_USERNAME ?? "my_helpday_bot";
const BOT_USERNAME = String(RAW_BOT).replace(/^@/, "");

export const TelegramAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { completeLoginWithToken } = useTelegramAuth();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("Проверяем токен входа из Telegram...");

  const loginUrl = useMemo(() => `https://t.me/${BOT_USERNAME}?start=login`, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Не найден токен в ссылке. Попробуйте снова авторизоваться через Telegram.");
        return;
      }

      const result = await completeLoginWithToken(token);
      if (!isMounted) return;

      if (result.ok) {
        setStatus("success");
        setMessage("Вход выполнен! Открываем ваш список задач...");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1200);
      } else {
        setStatus("error");
        const errorMessage = 'error' in result ? result.error : "Не удалось подтвердить токен";
        setMessage(errorMessage);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [token, completeLoginWithToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md space-y-4 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Авторизация через Telegram</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {status === "idle" && (
          <div className="text-sm text-muted-foreground">Подождите несколько секунд...</div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Убедитесь, что вы нажали кнопку «Start» в боте и перешли по новой ссылке из Telegram.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                const opened = window.open(loginUrl, "_blank", "noopener,noreferrer");
                if (!opened) {
                  window.location.href = loginUrl;
                }
              }}
            >
              Открыть Telegram-бота
            </Button>
            <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
              Вернуться на главную
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="text-sm text-muted-foreground">Синхронизируем данные...</div>
        )}
      </Card>
    </div>
  );
};

export default TelegramAuthCallback;
