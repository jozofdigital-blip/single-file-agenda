import { useState, useEffect } from "react";
import { format, parseISO, compareDesc } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/TaskItem";

interface Task {
  id: string;
  text: string;
  date: string;
  originalDate?: string;
}

const AllTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));

    const savedArchive = localStorage.getItem("archivedTasks");
    const archivedTasks = savedArchive ? JSON.parse(savedArchive) : [];
    const archivedTask = {
      ...taskToDelete,
      archivedAt: new Date().toISOString(),
    };
    archivedTasks.push(archivedTask);
    localStorage.setItem("archivedTasks", JSON.stringify(archivedTasks));
  };

  const handleUpdateTask = (id: string, newText: string, newDate?: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        return {
          ...task,
          text: newText,
          ...(newDate && { date: newDate }),
        };
      }
      return task;
    });
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

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
