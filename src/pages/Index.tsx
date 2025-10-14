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
  originalDate?: string;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Переносим просроченные задачи на сегодня
      const updatedTasks = parsedTasks.map((task: Task) => {
        if (task.date < today && !task.originalDate) {
          return {
            ...task,
            originalDate: task.date,
            date: today,
          };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      if (JSON.stringify(updatedTasks) !== JSON.stringify(parsedTasks)) {
        localStorage.setItem("tasks", JSON.stringify(updatedTasks));
      }
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
  };

  const handleUpdateTask = (id: string, newText: string, newDate: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const updatedTask = { ...task, text: newText };
        // Если дата меняется, сохраняем оригинальную дату, если её ещё нет
        if (newDate !== task.date) {
          updatedTask.date = newDate;
          if (!task.originalDate) {
            updatedTask.originalDate = task.date;
          }
        }
        return updatedTask;
      }
      return task;
    });
    setTasks(updatedTasks);
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
        onUpdateTask={handleUpdateTask}
      />
      <TaskInput onAddTask={handleAddTask} />
    </div>
  );
};

export default Index;
