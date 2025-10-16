import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface TelegramLoginProps {
  onLogin: () => void;
  isInTelegram: boolean;
}

export const TelegramLogin = ({ onLogin, isInTelegram }: TelegramLoginProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
            Ежедневник Задач
          </h1>
          <p className="text-muted-foreground">
            Простой и удобный планировщик для ваших задач
          </p>
        </div>

        <div className="space-y-4">
          {isInTelegram ? (
            <p className="text-center text-sm text-muted-foreground">
              Нажмите кнопку ниже, чтобы войти через Telegram
            </p>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-4 mb-2">
              <p className="text-sm text-muted-foreground">
                💡 Для привязки Telegram откройте приложение через бота в Telegram
              </p>
            </div>
          )}
          <Button
            onClick={onLogin}
            className="w-full h-12 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300"
          >
            {isInTelegram ? (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
                Войти через Telegram
              </>
            ) : (
              "Начать использование"
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
