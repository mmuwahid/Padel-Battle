import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkvqbwdsoxylkqhubhig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdnFid2Rzb3h5bGtxaHViaGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjI2NjUsImV4cCI6MjA4OTM5ODY2NX0.mBWVjb_uDLwLJo0KvCZfnfPFllSMlI2AYauJ6sKEBMI';

// S082: Safari/WebKit can reuse a dead keep-alive socket after the PWA sits
// idle (e.g. backgrounded on iOS), surfacing the FIRST request to any endpoint
// as a network-layer "TypeError: Load failed" / "Failed to fetch" before it
// reaches the server. Because the request never lands, a single transparent
// retry is safe (no duplicate writes). Wrapping fetch here centralizes the
// retry across every REST/RPC/auth call — replacing the per-call retry that
// previously lived only in SeasonManagement.
//
// Only true network-layer TypeErrors are retried. HTTP 4xx/5xx resolve as
// Response objects (they don't throw), so application errors are never retried.
const fetchWithRetry = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (/load failed|failed to fetch|network/i.test(err?.message || '')) {
      await new Promise((r) => setTimeout(r, 250));
      return await fetch(input, init);
    }
    throw err;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithRetry },
});
