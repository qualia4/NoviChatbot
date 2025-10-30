// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { AppContext } from "./types";

export function supa(c: AppContext) {
    return createClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            global: { fetch },
            auth: { persistSession: false },
        }
    );
}
