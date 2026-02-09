import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://xjcgrobeywchpfvmmiqe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqY2dyb2JleXdjaHBmdm1taXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODIyMzgsImV4cCI6MjA4NTg1ODIzOH0.MQ_M-bHdJB78oIt9Wpsqs8pXHWsE9yxnzoaHvAvrcqk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
