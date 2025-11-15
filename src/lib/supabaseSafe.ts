export let _supabaseCache: any = null;

export const getSupabase = async () => {
  if (_supabaseCache) return _supabaseCache;
  try {
    const mod = await import("@/integrations/supabase/client");
    _supabaseCache = (mod as any).supabase;
    return _supabaseCache;
  } catch (e) {
    console.error("[SUPABASE] client load failed", e);
    // Fallback: create client manually if Vite envs are not injected
    try {
      const { createClient } = await import("@supabase/supabase-js");
      // These are public values safe for client usage
      const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://muabqlydxqbktkxifahv.supabase.co";
      const SUPABASE_PUBLISHABLE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YWJxbHlkeHFia3RreGlmYWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTYxMDIsImV4cCI6MjA3NjE3MjEwMn0.z5M0DmI0WpNYvLqi7wDuyFjw3l5H_r7P07EJ9xMQwkY";
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error("Supabase fallback failed: missing URL or anon key");
      }
      _supabaseCache = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      });
      console.info("[SUPABASE] Fallback client initialized");
      return _supabaseCache;
    } catch (fallbackError) {
      console.error("[SUPABASE] fallback client init failed", fallbackError);
      throw fallbackError;
    }
  }
};
