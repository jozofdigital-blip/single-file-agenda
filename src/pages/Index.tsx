import { useState, useEffect } from "react";
import { format } from "date-fns";
import { WeekCalendar } from "@/components/WeekCalendar";
import { TaskList } from "@/components/TaskList";
import { TaskInput } from "@/components/TaskInput";
import { TelegramLogin } from "@/components/TelegramLogin";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTasks } from "@/hooks/useTasks";

const Index = () => {
  console.log('[Index] mount');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user, loading: authLoading, profileReady, signInWithTelegram, linkTelegramFromBrowser } = useTelegramAuth();
  const {
    tasks,
    loading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
    moveOverdueTasks,
  } = useTasks(user?.id);

  const isInTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);

  useEffect(() => {
    console.log('[Index] user', user?.id, 'authLoading', authLoading);
    if (user) {
      moveOverdueTasks();
    }
  }, [user]);

  // Auto-login if in Telegram Mini App and not logged in
  useEffect(() => {
    if (!authLoading && !user && isInTelegram) {
      console.log('[Index] Auto-login via Telegram Mini App');
      signInWithTelegram();
    }
  }, [authLoading, user, isInTelegram, signInWithTelegram]);

  const handleAddTask = async (text: string, time?: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await addTask(text, dateStr, time);
  };

  const handleUpdateTask = async (id: string, newText: string, newDate: string, newTime?: string) => {
    await updateTask(id, newText, newDate, newTime);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    
    toast.success('Задача выполнена');
  };


  console.log('[Index] render tasks', tasks.length);


  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-secondary/20">
      {user && <AppHeader userId={user.id} />}
      {user ? (
        <>
          <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <TaskList
            tasks={tasks}
            selectedDate={selectedDate}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        </>
      ) : null}
      {!user ? (
      <TelegramLogin
        variant="full"
        onLogin={signInWithTelegram}
        isInTelegram={isInTelegram}
      />
      ) : !profileReady ? (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="md:mx-auto md:max-w-2xl text-sm text-muted-foreground">Подготовка профиля...</div>
        </div>
      ) : (
        <TaskInput onAddTask={handleAddTask} />
      )}

    </div>
  );
};

export default Index;
