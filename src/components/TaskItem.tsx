import { Check } from "lucide-react";
import { useState } from "react";

interface TaskItemProps {
  task: string;
  onDelete: () => void;
}

export const TaskItem = ({ task, onDelete }: TaskItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete();
    }, 300);
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-soft ${
        isDeleting ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors duration-300 shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors duration-300" />
      </div>
      <p className="text-foreground flex-1 leading-relaxed">{task}</p>
    </div>
  );
};
