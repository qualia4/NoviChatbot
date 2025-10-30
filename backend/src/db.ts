// src/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AppContext } from "./types";

// optional: if you generated types via supabase CLI, import them here
// import type { Database } from "./supabase.types";

export function supa(c: AppContext) /*: SupabaseClient<Database>*/ {
    // One lightweight client per request; reusing across requests can leak env.
    return createClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            // Required for Cloudflare Workers
            global: { fetch },
            auth: { persistSession: false },
        }
    );
}
