import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ArchivedTask {
  id: string;
  text: string;
  date: string;
  archivedAt: string;
}

const Archive = () => {
  const navigate = useNavigate();
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);

  useEffect(() => {
    const savedArchive = localStorage.getItem("archivedTasks");
    if (savedArchive) {
      setArchivedTasks(JSON.parse(savedArchive));
    }
  }, []);

  const handleRestore = (task: ArchivedTask) => {
    // Remove from archive
    const updatedArchive = archivedTasks.filter((t) => t.id !== task.id);
    setArchivedTasks(updatedArchive);
    localStorage.setItem("archivedTasks", JSON.stringify(updatedArchive));

    // Add back to tasks
    const savedTasks = localStorage.getItem("tasks");
    const tasks = savedTasks ? JSON.parse(savedTasks) : [];
    const restoredTask = {
      id: task.id,
      text: task.text,
      date: task.date,
    };
    tasks.push(restoredTask);
    localStorage.setItem("tasks", JSON.stringify(tasks));

    toast.success("Задача восстановлена", {
      description: task.text,
    });
  };

  const handleClearAll = () => {
    if (archivedTasks.length === 0) return;
    
    toast("Очистить весь архив?", {
      description: "Это действие нельзя отменить",
      action: {
        label: "Очистить",
        onClick: () => {
          setArchivedTasks([]);
          localStorage.setItem("archivedTasks", JSON.stringify([]));
          toast.success("Архив очищен");
        },
      },
      cancel: {
        label: "Отмена",
        onClick: () => {},
      },
      duration: 5000,
    });
  };

  const groupedByDate = archivedTasks.reduce((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    return acc;
  }, {} as Record<string, ArchivedTask[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Архив задач</h1>
                <p className="text-sm text-muted-foreground">
                  {archivedTasks.length === 0
                    ? "Архив пуст"
                    : `${archivedTasks.length} ${
                        archivedTasks.length === 1
                          ? "выполненная задача"
                          : archivedTasks.length < 5
                          ? "выполненные задачи"
                          : "выполненных задач"
                      }`}
                </p>
              </div>
            </div>
            {archivedTasks.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearAll}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6">
        {archivedTasks.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <span className="text-3xl">📦</span>
            </div>
            <p className="text-muted-foreground">
              Выполненные задачи будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateString) => {
              const date = new Date(dateString);
              const tasks = groupedByDate[dateString];
              
              return (
                <div key={dateString} className="space-y-2 animate-fade-in">
                  <h2 className="text-sm font-semibold text-muted-foreground px-2">
                    {format(date, "d MMMM yyyy", { locale: ru })}
                  </h2>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border group hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="flex-1">
                          <p className="text-foreground leading-relaxed opacity-60 line-through">
                            {task.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Выполнено{" "}
                            {format(new Date(task.archivedAt), "d MMM, HH:mm", {
                              locale: ru,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(task)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archive;
