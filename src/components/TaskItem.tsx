import { Check, Edit2 } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { EditTaskDialog } from "./EditTaskDialog";

interface TaskItemProps {
  task: string;
  originalDate?: string;
  onDelete: () => void;
  onUpdate?: (newText: string, newDate: string) => void;
}

export const TaskItem = ({ task, originalDate, onDelete, onUpdate }: TaskItemProps) => {
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

  const handleSave = (newText: string, newDate: string) => {
    if (onUpdate) {
      onUpdate(newText, newDate);
    }
  };

  return (
    <>
      <div
        className={`group flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-soft ${
          isDeleting ? "animate-fade-out" : "animate-fade-in"
        }`}
      >
        <div
          onClick={handleComplete}
          className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors duration-300 shrink-0 mt-0.5 cursor-pointer"
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors duration-300" />
        </div>
        <div className="flex-1">
          <p className="text-foreground leading-relaxed">{task}</p>
          {originalDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Перенесено с {format(parseISO(originalDate), "d MMMM", { locale: ru })}
            </p>
          )}
        </div>
        {onUpdate && (
          <button
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-accent rounded shrink-0"
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
          taskDate={originalDate || currentDate}
          onSave={handleSave}
        />
      )}
    </>
  );
};
