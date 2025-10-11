// Server-only: JANGAN pernah dipakai di client/browser
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // dari Supabase → Project Settings → API
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env (URL or SERVICE_ROLE_KEY)");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
