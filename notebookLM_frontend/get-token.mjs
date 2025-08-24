import { createClient } from '@supabase/supabase-js';

// 1) Make sure these 4 are correct
const SUPABASE_URL = 'https://najsawhhrgdsnenudane.supabase.co'; // no trailing slash
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hanNhd2hocmdkc25lbnVkYW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTA4ODQsImV4cCI6MjA3MDQyNjg4NH0.ExfXlD2ToPQWJLtJFE8sXy6PGNI6rAEXgWB-iAxDVbY'; // (consider rotating later since it was shared)
const EMAIL = 'mudasir.saeed01@gmail.com'.trim();
const PASSWORD = 'StrongPass123!';

// 2) Create client and sign in
const supabase = createClient(SUPABASE_URL, ANON_KEY);
const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (error) {
  console.error('signIn error:', error.message);
  process.exit(1);
}

const token = data?.session?.access_token;
if (!token) {
  console.error('No access_token returned. Is the user confirmed?');
  process.exit(1);
}

console.log(token); // ← copy this and use it for backend tests
