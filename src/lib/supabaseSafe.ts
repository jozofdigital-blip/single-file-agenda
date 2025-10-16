export let _supabaseCache: any = null;

export const getSupabase = async () => {
  if (_supabaseCache) return _supabaseCache;
  try {
    const mod = await import("@/integrations/supabase/client");
    _supabaseCache = (mod as any).supabase;
    return _supabaseCache;
  } catch (e) {
    console.error("[SUPABASE] client load failed", e);
    throw e;
  }
};
