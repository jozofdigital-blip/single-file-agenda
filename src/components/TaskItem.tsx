import { Check, Edit2, Clock } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { EditTaskDialog } from "./EditTaskDialog";

interface TaskItemProps {
  task: string;
  time?: string;
  originalDate?: string;
  onDelete: () => void;
  onUpdate?: (newText: string, newDate: string, newTime?: string) => void;
}

export const TaskItem = ({ task, time, originalDate, onDelete, onUpdate }: TaskItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  const handleComplete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete();
    }, 300);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  const handleSave = (newText: string, newDate: string, newTime?: string) => {
    if (onUpdate) {
      onUpdate(newText, newDate, newTime);
    }
  };

  return (
    <>
      <div
        onClick={handleComplete}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " " ||
            event.key === "Space" ||
            event.key === "Spacebar"
          ) {
            event.preventDefault();
            handleComplete();
          }
        }}
        className={`group relative flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-soft cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isDeleting ? "animate-fade-out" : "animate-fade-in"
        }`}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors duration-300 shrink-0 mt-0.5">
          <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors duration-300" />
        </div>
        <div className="flex-1 pr-10">
          <div className="flex items-center gap-2">
            <p className="text-foreground leading-relaxed">{task}</p>
            {time && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{time.slice(0, 5)}</span>
              </div>
            )}
          </div>
          {originalDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Перенесено с {format(parseISO(originalDate), "d MMMM", { locale: ru })}
            </p>
          )}
        </div>
        {onUpdate && (
          <button
            type="button"
            onClick={handleEdit}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border border-transparent bg-background shadow-sm transition-colors duration-200 hover:border-primary/60 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Редактировать задачу"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {onUpdate && (
        <EditTaskDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          taskText={task}
          taskTime={time}
          taskDate={originalDate || currentDate}
          onSave={handleSave}
        />
      )}
    </>
  );
};
