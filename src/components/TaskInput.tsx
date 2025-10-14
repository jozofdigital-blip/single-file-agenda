import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface TaskInputProps {
  onAddTask: (task: string) => void;
}

export const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [task, setTask] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onAddTask(task.trim());
      setTask("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4"
    >
      <div className="container max-w-2xl mx-auto">
        <div className="flex gap-2">
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
