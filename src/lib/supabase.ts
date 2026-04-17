import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Database generic omitted until `npx supabase gen types typescript` is run.
// Replace with: createClient<Database>(url, key) once types are generated.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
