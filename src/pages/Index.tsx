import { useState, useEffect } from "react";
import { format } from "date-fns";
import { WeekCalendar } from "@/components/WeekCalendar";
import { TaskList } from "@/components/TaskList";
import { TaskInput } from "@/components/TaskInput";
import { toast } from "sonner";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTasks } from "@/hooks/useTasks";

const Index = () => {
  console.log('[Index] mount');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user, loading: authLoading } = useTelegramAuth();
  const {
    tasks,
    loading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
    moveOverdueTasks,
  } = useTasks(user?.id);

  useEffect(() => {
    console.log('[Index] user', user?.id, 'authLoading', authLoading);
    if (user) {
      moveOverdueTasks();
    }
  }, [user]);

  const handleAddTask = async (text: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await addTask(text, dateStr);
  };

  const handleUpdateTask = async (id: string, newText: string, newDate: string) => {
    await updateTask(id, newText, newDate);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    
    toast.success('Задача выполнена');
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-background to-secondary/20">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  console.log('[Index] render tasks', tasks.length);


  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-secondary/20">
      <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <TaskList
        tasks={tasks}
        selectedDate={selectedDate}
        onDeleteTask={handleDeleteTask}
        onUpdateTask={handleUpdateTask}
      />
      <TaskInput onAddTask={handleAddTask} />
    </div>
  );
};

export default Index;
