import { useEffect } from "react";
import { format, parseISO, compareDesc } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/TaskItem";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTasks, Task } from "@/hooks/useTasks";

const AllTasks = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useTelegramAuth();
  const {
    tasks,
    loading: tasksLoading,
    deleteTask,
    updateTask,
  } = useTasks(user?.id);

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleUpdateTask = async (id: string, newText: string, newDate?: string) => {
    await updateTask(id, newText, newDate);
  };

  if (authLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-background to-secondary/20">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const groupedTasks = tasks.reduce((acc, task) => {
    const date = task.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedDates = Object.keys(groupedTasks).sort((a, b) =>
    compareDesc(parseISO(a), parseISO(b))
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
              Все задачи
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-muted-foreground">Нет задач</p>
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="mb-8 animate-fade-in">
                <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
                  {format(parseISO(date), "d MMMM yyyy", { locale: ru })}
                </h2>
                <div className="space-y-2">
                  {groupedTasks[date].map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task.text}
                      originalDate={task.originalDate}
                      onDelete={() => handleDeleteTask(task.id)}
                      onUpdate={(newText, newDate) =>
                        handleUpdateTask(task.id, newText, newDate)
                      }
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTasks;
