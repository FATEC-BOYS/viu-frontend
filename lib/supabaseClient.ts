'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// Se você tem tipos gerados pelo supabase:
// import type { Database } from '@/lib/database.types';
// export const supabase = createClientComponentClient<Database>();

export const supabase = createClientComponentClient();
