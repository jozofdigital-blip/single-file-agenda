import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export interface Task {
  id: string;
  text: string;
  date: string;
  originalDate?: string;
}

export interface ArchivedTask {
  id: string;
  text: string;
  date: string;
  archivedAt: string;
}

export const useTasks = (userId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks from database
  const fetchTasks = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedTasks = data.map((task) => ({
          id: task.id,
          text: task.text,
          date: task.date,
          originalDate: task.original_date || undefined,
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // Fetch archived tasks
  const fetchArchivedTasks = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("archived_tasks")
        .select("*")
        .eq("user_id", userId)
        .order("archived_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((task) => ({
          id: task.id,
          text: task.text,
          date: task.date,
          archivedAt: task.archived_at,
        }));
        setArchivedTasks(formatted);
      }
    } catch (error) {
      console.error("Error fetching archived tasks:", error);
    }
  };

  // Add new task
  const addTask = async (text: string, date: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          text,
          date,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTask: Task = {
          id: data.id,
          text: data.text,
          date: data.date,
          originalDate: data.original_date || undefined,
        };
        setTasks((prev) => [...prev, newTask]);
        try { toast.success("Задача добавлена"); } catch {}
      }
    } catch (error: any) {
      console.error("Error adding task:", error);
      try { toast.error(`Не удалось добавить задачу: ${error?.message || ""}`); } catch {}
    }
  };

  // Update task
  const updateTask = async (id: string, text: string, date?: string) => {
    if (!userId) return;

    try {
      const updates: any = { text };
      if (date) updates.date = date;

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, text, ...(date && { date }) }
            : task
        )
      );
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Delete task and archive it
  const deleteTask = async (id: string) => {
    if (!userId) return;

    try {
      // Get task before deleting
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Archive the task
      const { error: archiveError } = await supabase
        .from("archived_tasks")
        .insert({
          user_id: userId,
          text: task.text,
          date: task.date,
        });

      if (archiveError) throw archiveError;

      // Delete from tasks
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Restore archived task
  const restoreTask = async (archivedTask: ArchivedTask) => {
    if (!userId) return;

    try {
      // Add back to tasks
      const { data, error: addError } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          text: archivedTask.text,
          date: archivedTask.date,
        })
        .select()
        .single();

      if (addError) throw addError;

      // Delete from archived
      const { error: deleteError } = await supabase
        .from("archived_tasks")
        .delete()
        .eq("id", archivedTask.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      if (data) {
        const newTask: Task = {
          id: data.id,
          text: data.text,
          date: data.date,
        };
        setTasks((prev) => [...prev, newTask]);
        setArchivedTasks((prev) => prev.filter((t) => t.id !== archivedTask.id));
      }
    } catch (error) {
      console.error("Error restoring task:", error);
    }
  };

  // Clear all archived tasks
  const clearArchive = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("archived_tasks")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setArchivedTasks([]);
    } catch (error) {
      console.error("Error clearing archive:", error);
    }
  };

  // Move overdue tasks to today
  const moveOverdueTasks = async () => {
    if (!userId) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const overdueTasks = tasks.filter((task) => task.date < today);

    if (overdueTasks.length === 0) return;

    try {
      for (const task of overdueTasks) {
        await supabase
          .from("tasks")
          .update({
            date: today,
            original_date: task.originalDate || task.date,
          })
          .eq("id", task.id)
          .eq("user_id", userId);
      }

      await fetchTasks();
    } catch (error) {
      console.error("Error moving overdue tasks:", error);
    }
  };

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setArchivedTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchTasks(), fetchArchivedTasks()]).finally(() =>
      setLoading(false)
    );
  }, [userId]);

  return {
    tasks,
    archivedTasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    clearArchive,
    moveOverdueTasks,
    refetch: fetchTasks,
  };
};
