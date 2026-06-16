import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fgxlebixvsevwnesohgt.supabase.co";
const supabaseKey = "sb_publishable_4FQOfRMax8AewgCBVDMaqw_fxjthhl6";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);