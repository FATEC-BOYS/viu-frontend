// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseServer() {
  // Garantia de uso apenas no servidor
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseServer() só pode ser usado no servidor.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

  if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
