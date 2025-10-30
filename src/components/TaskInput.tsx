import { Plus, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface TaskInputProps {
  onAddTask: (task: string, time?: string) => void;
}

export const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [task, setTask] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onAddTask(task.trim(), time || undefined);
      setTask("");
      setTime("");
      setShowTime(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 sm:px-6 sm:py-4"
    >
      <div className="w-full md:mx-auto md:max-w-2xl space-y-2">
        {showTime && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 text-base rounded-lg"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowTime(!showTime)}
            className="h-12 w-12 rounded-xl shrink-0"
          >
            <Clock className={`h-5 w-5 ${showTime ? 'text-primary' : ''}`} />
          </Button>
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Новая задача..."
            className="flex-1 h-12 text-base rounded-xl border-2 focus-visible:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0 bg-gradient-to-br from-primary to-[hsl(250_70%_60%)] hover:shadow-hover transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  );
};
