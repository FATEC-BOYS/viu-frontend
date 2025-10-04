import { createClient } from "@supabase/supabase-js";
export function getSupabaseServer() {
  if (typeof window !== "undefined") throw new Error("server only");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // no vercel: env server
  return createClient(url, key, { auth: { persistSession: false } });
}
