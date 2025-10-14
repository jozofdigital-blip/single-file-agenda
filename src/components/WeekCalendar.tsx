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
      <div className="container max-w-2xl mx-auto px-4 py-4">
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
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-1 flex-1 justify-center overflow-x-auto scrollbar-hide">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={`flex flex-col items-center justify-center min-w-[52px] h-[68px] rounded-xl transition-all duration-300 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-soft scale-105"
                      : isToday
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-xs font-medium opacity-70 mb-1">
                    {format(day, "EEE", { locale: ru })}
                  </span>
                  <span className={`text-xl font-semibold ${isSelected ? "" : ""}`}>
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
            className="shrink-0"
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
