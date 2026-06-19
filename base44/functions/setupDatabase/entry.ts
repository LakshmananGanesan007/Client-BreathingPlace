/**
 * Creates all required Supabase tables with RLS policies.
 * Uses service role key to execute SQL via Supabase's pg REST endpoint.
 * Call once from admin panel or test_backend_function.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  return res;
}

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets.' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

    const results = [];

    // Alter existing tables if they exist to change user_id to text
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.user_profiles ALTER COLUMN user_id TYPE text;
        ALTER TABLE public.customer_profiles ALTER COLUMN user_id TYPE text;
        ALTER TABLE public.therapist_profiles ALTER COLUMN user_id TYPE text;
      `
    });

    // 1. user_profiles
    const r1 = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text UNIQUE NOT NULL,
          email text,
          selected_role text,
          profile_status text DEFAULT 'pending',
          approval_status text,
          last_completed_step int DEFAULT 0,
          total_steps int DEFAULT 0,
          step_data jsonb DEFAULT '{}',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users manage own profile') THEN
            CREATE POLICY "Users manage own profile" ON public.user_profiles
              FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
          END IF;
        END$$;
      `
    });
    results.push({ table: 'user_profiles', error: r1.error?.message || null });

    // 2. customer_profiles
    const r2 = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.customer_profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text UNIQUE NOT NULL,
          full_name text,
          gender text,
          dob text,
          address text,
          phone text,
          occupation text,
          relationship_status text,
          preferred_language text,
          profile_photo_url text,
          main_concerns text[],
          previous_therapy boolean DEFAULT false,
          current_medication text,
          anxiety_level text,
          stress_level text,
          sleep_quality text,
          depression_history boolean DEFAULT false,
          emergency_contact text,
          preferred_therapist_gender text,
          preferred_session_time text,
          profile_complete boolean DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_profiles' AND policyname='Users manage own customer profile') THEN
            CREATE POLICY "Users manage own customer profile" ON public.customer_profiles
              FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
          END IF;
        END$$;
      `
    });
    results.push({ table: 'customer_profiles', error: r2.error?.message || null });

    // 3. therapist_profiles
    const r3 = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.therapist_profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text UNIQUE NOT NULL,
          full_name text,
          phone text,
          bio text,
          qualification text,
          experience_years int DEFAULT 0,
          specializations text[],
          languages text[],
          profile_photo_url text,
          gov_id_url text,
          certificates_url text,
          license_url text,
          approval_status text DEFAULT 'pending',
          rejection_reason text,
          available_days text[],
          available_times text[],
          consultation_fee numeric DEFAULT 0,
          currency text DEFAULT 'INR',
          profile_complete boolean DEFAULT false,
          slug text,
          profile_color text DEFAULT '#2E8B57',
          profile_tagline text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='therapist_profiles' AND policyname='Users manage own therapist profile') THEN
            CREATE POLICY "Users manage own therapist profile" ON public.therapist_profiles
              FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
          END IF;
        END$$;
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='therapist_profiles' AND policyname='Approved therapist profiles are public') THEN
            CREATE POLICY "Approved therapist profiles are public" ON public.therapist_profiles
              FOR SELECT USING (approval_status = 'approved');
          END IF;
        END$$;
      `
    });
    results.push({ table: 'therapist_profiles', error: r3.error?.message || null });

    // Check if rpc approach failed (exec_sql may not exist) — provide SQL fallback
    const anyRpcError = results.some(r => r.error && r.error.includes('function') && r.error.includes('does not exist'));

    if (anyRpcError) {
      // Return the SQL for manual execution
      return Response.json({
        status: 'manual_required',
        message: 'The exec_sql RPC function does not exist in your Supabase project. Please run the SQL below manually in your Supabase SQL Editor: Dashboard → SQL Editor → New Query → paste → Run',
        sql: getManualSQL(),
        rpc_results: results,
      });
    }

    const errors = results.filter(r => r.error);
    return Response.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: errors.length === 0 ? 'All tables created successfully!' : 'Some tables had errors — check details.',
      results,
      manual_sql: errors.length > 0 ? getManualSQL() : undefined,
    });

  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message,
      manual_sql: getManualSQL(),
      message: 'Error running setup. Please run the manual_sql in your Supabase SQL Editor.',
    }, { status: 500 });
  }
});

function getManualSQL() {
  return `
-- ============================================================
-- Run this entire block in Supabase Dashboard > SQL Editor
-- ============================================================

-- Fix existing tables if they were created with uuid
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN user_id TYPE text;
  EXCEPTION WHEN OTHERS THEN END;
  BEGIN
    ALTER TABLE public.customer_profiles ALTER COLUMN user_id TYPE text;
  EXCEPTION WHEN OTHERS THEN END;
  BEGIN
    ALTER TABLE public.therapist_profiles ALTER COLUMN user_id TYPE text;
  EXCEPTION WHEN OTHERS THEN END;
END $$;

-- 1. user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  email text,
  selected_role text,
  profile_status text DEFAULT 'pending',
  approval_status text,
  last_completed_step int DEFAULT 0,
  total_steps int DEFAULT 0,
  step_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users manage own profile') THEN
    CREATE POLICY "Users manage own profile" ON public.user_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 2. customer_profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  gender text,
  dob text,
  address text,
  phone text,
  occupation text,
  relationship_status text,
  preferred_language text,
  profile_photo_url text,
  main_concerns text[],
  previous_therapy boolean DEFAULT false,
  current_medication text,
  anxiety_level text,
  stress_level text,
  sleep_quality text,
  depression_history boolean DEFAULT false,
  emergency_contact text,
  preferred_therapist_gender text,
  preferred_session_time text,
  profile_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_profiles' AND policyname='Users manage own customer profile') THEN
    CREATE POLICY "Users manage own customer profile" ON public.customer_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 3. therapist_profiles
CREATE TABLE IF NOT EXISTS public.therapist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  full_name text,
  phone text,
  bio text,
  qualification text,
  experience_years int DEFAULT 0,
  specializations text[],
  languages text[],
  profile_photo_url text,
  gov_id_url text,
  certificates_url text,
  license_url text,
  approval_status text DEFAULT 'pending',
  rejection_reason text,
  available_days text[],
  available_times text[],
  consultation_fee numeric DEFAULT 0,
  currency text DEFAULT 'INR',
  profile_complete boolean DEFAULT false,
  slug text,
  profile_color text DEFAULT '#2E8B57',
  profile_tagline text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='therapist_profiles' AND policyname='Users manage own therapist profile') THEN
    CREATE POLICY "Users manage own therapist profile" ON public.therapist_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='therapist_profiles' AND policyname='Approved therapist profiles are public') THEN
    CREATE POLICY "Approved therapist profiles are public" ON public.therapist_profiles
      FOR SELECT USING (approval_status = 'approved');
  END IF;
END$$;
`.trim();
}