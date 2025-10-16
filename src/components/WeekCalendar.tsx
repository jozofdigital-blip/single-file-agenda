import { format, addWeeks, startOfWeek, addDays, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Archive, List } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface WeekCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const WeekCalendar = ({ selectedDate, onSelectDate }: WeekCalendarProps) => {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  
  const startDate = startOfWeek(addWeeks(new Date(), weekOffset), { 
    weekStartsOn: 1,
    locale: ru 
  });
  
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
      <div className="container max-w-2xl mx-auto px-3 py-4 sm:px-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-[hsl(250_70%_60%)] bg-clip-text text-transparent">
            Ежедневник
          </h1>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/all-tasks")}
              className="shrink-0"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/archive")}
              className="shrink-0"
            >
              <Archive className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="h-8 w-8 rounded-full shrink-0 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="grid flex-1 grid-cols-7 gap-1 sm:gap-2">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={`flex flex-col items-center justify-center rounded-lg px-1 py-2 text-[10px] leading-tight transition-all duration-300 sm:text-xs ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : isToday
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="mb-1 font-medium tracking-wide opacity-70">
                    {format(day, "ccc", { locale: ru })}
                  </span>
                  <span className="text-base font-semibold sm:text-lg">
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="h-8 w-8 rounded-full shrink-0 sm:h-10 sm:w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-sm text-muted-foreground">
            {format(startDate, "MMMM yyyy", { locale: ru })}
          </p>
        </div>
      </div>
    </div>
  );
};
