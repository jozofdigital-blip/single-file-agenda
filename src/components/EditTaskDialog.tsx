import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskText: string;
  taskTime?: string;
  taskDate: string;
  onSave: (newText: string, newDate: string, newTime?: string) => void;
}

export const EditTaskDialog = ({
  open,
  onOpenChange,
  taskText,
  taskTime,
  taskDate,
  onSave,
}: EditTaskDialogProps) => {
  const [text, setText] = useState(taskText);
  const [time, setTime] = useState(taskTime || "");
  const [date, setDate] = useState<Date>(parseISO(taskDate));

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), format(date, "yyyy-MM-dd"), time || undefined);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать задачу</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст задачи"
            className="w-full"
          />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Время"
              className="w-full"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "d MMMM yyyy", { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                locale={ru}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleSave} className="w-full">
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
