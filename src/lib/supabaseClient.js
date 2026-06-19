import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weyaamphuxwzfbqkweaf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndleWFhbXBodXh3emZicWt3ZWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTU0MjAsImV4cCI6MjA5NTg5MTQyMH0.8mQAFDGlnlhdZGAC25BU0HJhtmciauUH4C5879LUzCE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);