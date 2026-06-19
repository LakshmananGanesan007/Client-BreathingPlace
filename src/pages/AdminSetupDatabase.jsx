import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Database, AlertCircle } from "lucide-react";

const SQL = `-- ============================================================
-- Run this entire block in Supabase Dashboard > SQL Editor
-- ============================================================

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
  platform_markup_percentage numeric DEFAULT 0,
  final_customer_price numeric DEFAULT 0,
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

-- 4. Updates for existing tables
DO $$ BEGIN
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS platform_markup_percentage numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS final_customer_price numeric DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
END$$;
`;

export default function AdminSetupDatabase() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const steps = [
    { num: 1, text: "Click \"Copy SQL\" below to copy all the SQL statements" },
    { num: 2, text: "Open your Supabase Dashboard → SQL Editor → New Query" },
    { num: 3, text: "Paste the SQL and click \"Run\"" },
    { num: 4, text: "All 3 tables (user_profiles, customer_profiles, therapist_profiles) will be created with proper RLS policies" },
  ];

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Database Setup</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Required one-time setup to create Supabase tables for user profiles.
          </p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Action Required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              The tables <code className="bg-amber-100 px-1 rounded">user_profiles</code>, <code className="bg-amber-100 px-1 rounded">customer_profiles</code>, and <code className="bg-amber-100 px-1 rounded">therapist_profiles</code> do not exist yet. Profile submissions will fail until you run the SQL below.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-sm text-foreground mb-4">How to set up:</h2>
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.num} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.num}</span>
                <p className="text-sm text-gray-700">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleCopy} className={copied ? "bg-green-600 hover:bg-green-700" : ""}>
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy SQL"}
            </Button>
            <Button variant="outline" asChild>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </a>
            </Button>
          </div>
        </div>

        {/* SQL Preview */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">setup.sql</span>
            <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {SQL}
          </pre>
        </div>
      </div>
    </div>
  );
}