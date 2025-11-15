import { Plus, Clock, Calendar as CalendarIcon } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";

interface TaskInputProps {
  onAddTask: (task: string, time?: string) => void;
  onAddTaskWithDate?: (task: string, date: string, time?: string) => void;
}

export const TaskInput = ({ onAddTask, onAddTaskWithDate }: TaskInputProps) => {
  const [task, setTask] = useState("");
  const [time, setTime] = useState("");
  const [showTime, setShowTime] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [pickerTime, setPickerTime] = useState("");
  const longPressTimer = useRef<NodeJS.Timeout>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onAddTask(task.trim(), time || undefined);
      setTask("");
      setTime("");
      setShowTime(false);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDatePicker(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDateTimeSelect = () => {
    if (task.trim() && selectedDate && onAddTaskWithDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onAddTaskWithDate(task.trim(), dateStr, pickerTime || undefined);
      setTask("");
      setSelectedDate(undefined);
      setPickerTime("");
      setShowDatePicker(false);
    }
  };

  return (
    <>
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
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              className="h-12 w-12 rounded-full shrink-0 bg-[hsl(210_100%_55%)] hover:bg-[hsl(210_100%_50%)] shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
            >
              <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Выберите дату и время</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Задача</label>
              <Input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Новая задача..."
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Дата</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Время (необязательно)</label>
              <Input
                type="time"
                value={pickerTime}
                onChange={(e) => setPickerTime(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleDateTimeSelect}
              disabled={!task.trim() || !selectedDate}
              className="w-full"
            >
              Добавить задачу
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
