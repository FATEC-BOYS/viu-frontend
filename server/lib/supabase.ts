import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function ensureBucket(name: string) {
  if (!supabaseAdmin) return;
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    const exists = buckets?.some((b) => b.name === name);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(name, { public: false });
    }
  } catch (e) {
    // no-op if permission error or already exists
  }
}
