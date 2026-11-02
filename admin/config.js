const SUPABASE_URL = "https://wqwmtsfbceibhtzntxse.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_IyZCny5fyZywRm5CLrz9lA_S5wYScpA";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);