import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabaseSafe";

interface NotificationSettingsProps {
  userId: string;
}

export const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState("");
  const [minutesBefore, setMinutesBefore] = useState(15);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadSettings();
    }
  }, [open, userId]);

  const loadSettings = async () => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setEnabled(data.telegram_notifications_enabled || false);
        setChatId(data.telegram_chat_id || "");
        setMinutesBefore(data.notification_minutes_before || 15);
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
      toast.error("Не удалось загрузить настройки");
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      
      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: userId,
          telegram_notifications_enabled: enabled,
          telegram_chat_id: chatId || null,
          notification_minutes_before: minutesBefore,
        });

      if (error) throw error;

      toast.success("Настройки сохранены");
      setOpen(false);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Не удалось сохранить настройки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-10 w-10 rounded-full"
      >
        {enabled ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки уведомлений</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-enabled" className="flex flex-col gap-1">
                <span>Уведомления в Telegram</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Получать напоминания о задачах
                </span>
              </Label>
              <Switch
                id="notifications-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="chat-id">
                    Telegram Chat ID
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      (получите у @userinfobot)
                    </span>
                  </Label>
                  <Input
                    id="chat-id"
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minutes-before">
                    За сколько минут напоминать
                  </Label>
                  <Input
                    id="minutes-before"
                    type="number"
                    min="1"
                    max="120"
                    value={minutesBefore}
                    onChange={(e) => setMinutesBefore(Number(e.target.value))}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                  <p className="font-medium">Как получить Chat ID:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Напишите @userinfobot в Telegram</li>
                    <li>Отправьте любое сообщение</li>
                    <li>Скопируйте ваш ID из ответа</li>
                  </ol>
                </div>
              </>
            )}

            <Button
              onClick={saveSettings}
              disabled={loading || (enabled && !chatId)}
              className="w-full"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
