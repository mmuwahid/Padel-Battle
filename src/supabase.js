import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkvqbwdsoxylkqhubhig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdnFid2Rzb3h5bGtxaHViaGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjI2NjUsImV4cCI6MjA4OTM5ODY2NX0.mBWVjb_uDLwLJo0KvCZfnfPFllSMlI2AYauJ6sKEBMI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
