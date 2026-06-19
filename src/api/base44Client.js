import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabase } from '@/lib/supabaseClient';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Create base44 client - token will be set dynamically from Supabase session
export const base44 = createClient({
  appId,
  token: appParams.token, // fallback for direct base44 logins
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Inject Supabase JWT into base44 client so entity calls are authenticated
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) {
    base44.auth.setToken(session.access_token);
  }
});

// Keep token in sync when Supabase auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    base44.auth.setToken(session.access_token);
  }
});