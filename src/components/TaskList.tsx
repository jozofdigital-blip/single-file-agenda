import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TaskItem } from "./TaskItem";

interface Task {
  id: string;
  text: string;
  date: string;
  originalDate?: string;
}

interface TaskListProps {
  tasks: Task[];
  selectedDate: Date;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, newText: string, newDate: string) => void;
}

export const TaskList = ({ tasks, selectedDate, onDeleteTask, onUpdateTask }: TaskListProps) => {
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const todayTasks = tasks.filter((task) => task.date === dateString);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
            {format(selectedDate, "d MMMM", { locale: ru })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todayTasks.length === 0
              ? "Нет задач"
              : `${todayTasks.length} ${todayTasks.length === 1 ? "задача" : "задачи"}`}
          </p>
        </div>

        <div className="space-y-2">
          {todayTasks.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <span className="text-3xl">✨</span>
              </div>
              <p className="text-muted-foreground">
                Добавьте первую задачу на этот день
              </p>
            </div>
          ) : (
            todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task.text}
                originalDate={task.originalDate}
                onDelete={() => onDeleteTask(task.id)}
                onUpdate={(newText, newDate) =>
                  onUpdateTask(task.id, newText, newDate)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
