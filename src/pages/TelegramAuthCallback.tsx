import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

type ImportMetaEnv = { env?: Record<string, string | undefined> };

const RAW_BOT = (import.meta as unknown as ImportMetaEnv).env?.VITE_TELEGRAM_BOT_USERNAME ?? "my_helpday_bot";
const BOT_USERNAME = String(RAW_BOT).replace(/^@/, "");

const decodeJsonObject = (raw: string | null | undefined) => {
  if (!raw) return null;
  const attempts: string[] = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) {
      attempts.push(decoded);
    }
  } catch (_error) {
    // ignore decode issues – we'll stick with the original string
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
};

const sanitizeTelegramPayload = (params: URLSearchParams): Record<string, unknown> | null => {
  const workingParams = new URLSearchParams(params.toString());
  workingParams.delete("token");

  const jsonPayload = decodeJsonObject(workingParams.get("tgAuthResult") ?? workingParams.get("tg_auth_result"));
  if (jsonPayload) {
    const normalized: Record<string, unknown> = { ...jsonPayload };
    if (typeof normalized.user === "string") {
      const nested = decodeJsonObject(normalized.user);
      if (nested) {
        normalized.user = nested;
      }
    }
    return normalized;
  }

  if (!workingParams.has("hash")) {
    return null;
  }

  const record: Record<string, unknown> = {};
  workingParams.forEach((value, key) => {
    if (key === "tgAuthResult" || key === "tg_auth_result") return;
    record[key] = value;
  });

  return record;
};

export const TelegramAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchSignature = useMemo(() => searchParams.toString(), [searchParams]);
  const token = useMemo(() => {
    if (!searchSignature) return null;
    const params = new URLSearchParams(searchSignature);
    const value = params.get("token");
    return value && value.trim().length > 0 ? value : null;
  }, [searchSignature]);
  const loginPayload = useMemo(() => {
    if (!searchSignature) return null;
    const params = new URLSearchParams(searchSignature);
    const payload = sanitizeTelegramPayload(params);
    if (!payload) return null;
    if (typeof payload.hash !== "string" || payload.hash.length === 0) {
      return null;
    }
    return payload;
  }, [searchSignature]);
  const { completeLoginWithToken, completeLoginWithLoginPayload } = useTelegramAuth();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("Проверяем данные из Telegram...");

  const loginUrl = useMemo(() => `https://t.me/${BOT_USERNAME}?start=login`, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (token) {
        setMessage("Проверяем токен входа из Telegram...");
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
          setMessage(result.error ?? "Не удалось подтвердить токен");
        }
        return;
      }

      if (loginPayload) {
        setMessage("Проверяем данные авторизации из Telegram...");
        const result = await completeLoginWithLoginPayload(loginPayload);
        if (!isMounted) return;

        if (result.ok) {
          setStatus("success");
          setMessage("Вход выполнен! Открываем ваш список задач...");
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1200);
        } else {
          setStatus("error");
          setMessage(result.error ?? "Не удалось подтвердить данные Telegram");
        }
        return;
      }

      setStatus("error");
      setMessage("Не найдены данные авторизации. Попробуйте войти через Telegram ещё раз.");
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [token, loginPayload, completeLoginWithToken, completeLoginWithLoginPayload, navigate]);

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
