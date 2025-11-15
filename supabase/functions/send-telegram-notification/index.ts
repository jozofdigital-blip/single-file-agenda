import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    console.log(`[NOTIFY] Checking for tasks at ${now.toISOString()}`);

    // Get all users with notifications enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("telegram_notifications_enabled", true)
      .not("telegram_chat_id", "is", null);

    if (settingsError) {
      console.error("[NOTIFY] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.log("[NOTIFY] No users with notifications enabled");
      return new Response(
        JSON.stringify({ ok: true, message: "No users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[NOTIFY] Found ${settings.length} users with notifications enabled`);

    let notificationsSent = 0;

    // Check tasks for each user
    for (const setting of settings) {
      const { user_id, telegram_chat_id, notification_minutes_before } = setting;

      // Get today's tasks with time set
      const today = new Date().toISOString().split("T")[0];
      
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today)
        .not("time", "is", null);

      if (tasksError) {
        console.error(`[NOTIFY] Error fetching tasks for user ${user_id}:`, tasksError);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        continue;
      }

      // Check each task
      for (const task of tasks) {
        const [hours, minutes] = task.time.split(":").map(Number);
        const taskMinutes = hours * 60 + minutes;
        const minutesUntilTask = taskMinutes - currentMinutes;

        // Send notification if it's time (within a 5-minute window around the notification time)
        if (
          minutesUntilTask <= notification_minutes_before &&
          minutesUntilTask >= notification_minutes_before - 5
        ) {
          const message = `⏰ Напоминание о задаче!\n\n${task.text}\n\nВремя: ${task.time}`;

          try {
            const response = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: telegram_chat_id,
                  text: message,
                  parse_mode: "HTML",
                }),
              }
            );

            if (response.ok) {
              notificationsSent++;
              console.log(`[NOTIFY] Sent notification for task ${task.id} to user ${user_id}`);
            } else {
              const error = await response.text();
              console.error(`[NOTIFY] Failed to send notification:`, error);
            }
          } catch (error) {
            console.error(`[NOTIFY] Error sending Telegram message:`, error);
          }
        }
      }
    }

    console.log(`[NOTIFY] Sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({ ok: true, notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[NOTIFY] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
