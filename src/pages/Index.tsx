import { useState, useEffect } from "react";
import { format } from "date-fns";
import { WeekCalendar } from "@/components/WeekCalendar";
import { TaskList } from "@/components/TaskList";
import { TaskInput } from "@/components/TaskInput";
import { toast } from "sonner";

interface Task {
  id: string;
  text: string;
  date: string;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      date: format(selectedDate, "yyyy-MM-dd"),
    };
    setTasks([...tasks, newTask]);
    toast.success("Задача добавлена", {
      description: text,
    });
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    // Remove from active tasks
    setTasks(tasks.filter((t) => t.id !== id));

    // Add to archive
    const savedArchive = localStorage.getItem("archivedTasks");
    const archivedTasks = savedArchive ? JSON.parse(savedArchive) : [];
    const archivedTask = {
      ...taskToDelete,
      archivedAt: new Date().toISOString(),
    };
    archivedTasks.push(archivedTask);
    localStorage.setItem("archivedTasks", JSON.stringify(archivedTasks));

    toast.success("Задача выполнена", {
      description: taskToDelete.text,
      action: {
        label: "Отменить",
        onClick: () => {
          setTasks((currentTasks) => [...currentTasks, taskToDelete]);
          // Remove from archive
          const updatedArchive = archivedTasks.filter((t: any) => t.id !== id);
          localStorage.setItem("archivedTasks", JSON.stringify(updatedArchive));
          toast.success("Задача восстановлена");
        },
      },
      duration: 5000,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-secondary/20">
      <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <TaskList
        tasks={tasks}
        selectedDate={selectedDate}
        onDeleteTask={handleDeleteTask}
      />
      <TaskInput onAddTask={handleAddTask} />
    </div>
  );
};

export default Index;
