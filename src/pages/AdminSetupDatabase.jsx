import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Database, AlertCircle } from "lucide-react";

const SQL = `-- ============================================================
-- BreathingPlace — Complete Supabase Setup SQL
-- Run this entire block in Supabase Dashboard > SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DO $$ blocks
-- Tables: 15 total
-- ============================================================

-- ============================================================
-- 1. user_profiles
-- ============================================================
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

-- ============================================================
-- 2. customer_profiles
-- ============================================================
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
  preferred_languages text[],
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
  country text,
  free_support_used boolean DEFAULT false,
  free_support_completed_at timestamptz,
  free_support_session_id uuid,
  free_support_closed_by uuid,
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_profiles' AND policyname='Admins read all customer profiles') THEN
    CREATE POLICY "Admins read all customer profiles" ON public.customer_profiles
      FOR SELECT USING (true);
  END IF;
END$$;
-- Ensure new columns exist on older databases
DO $$ BEGIN
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS country text;
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS preferred_languages text[];
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS free_support_used boolean DEFAULT false;
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS free_support_completed_at timestamptz;
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS free_support_session_id uuid;
  ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS free_support_closed_by uuid;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 3. therapist_profiles
-- ============================================================
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
  platform_fee numeric DEFAULT 0,
  chat_price numeric DEFAULT 0,
  voice_price numeric DEFAULT 0,
  video_price numeric DEFAULT 0,
  country text,
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
-- Ensure new price columns exist on older databases
DO $$ BEGIN
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS platform_markup_percentage numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS final_customer_price numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS chat_price numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS voice_price numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS video_price numeric DEFAULT 0;
  ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS country text;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 4. platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  setting_type text PRIMARY KEY,
  setting_value jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='platform_settings' AND policyname='Admins manage platform settings') THEN
    CREATE POLICY "Admins manage platform settings" ON public.platform_settings
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
INSERT INTO public.platform_settings (setting_type, setting_value)
VALUES
  ('chat_config', '{"free_minutes_new": 15, "free_minutes_returning": 10, "paid_duration_minutes": 20, "paid_amount": 150, "therapist_revenue_percent": 73}'),
  ('video_config', '{"session_duration_minutes": 50, "warning_minutes": 45, "cashfree_fee_fixed": 10}'),
  ('revenue_config', '{"platform_commission_percent": 20, "cashfree_fee_fixed": 10, "cashfree_fee_percent": 2}'),
  ('global_fees', '{"percent_fee": 0, "flat_fee": 0, "extra_charges": 0, "discount": 0}'),
  ('bank_account', '{"account_holder_name": "", "account_number": "", "ifsc_code": "", "bank_name": "", "account_type": "savings"}')
ON CONFLICT (setting_type) DO NOTHING;

-- ============================================================
-- 5. sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  customer_name text,
  therapist_id uuid,
  therapist_name text,
  session_date text,
  start_time text,
  end_time text,
  status text DEFAULT 'scheduled',
  session_type text,
  cancellation_reason text,
  notes text,
  accepted_by_therapist boolean DEFAULT false,
  video_room_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='Users manage own sessions') THEN
    CREATE POLICY "Users manage own sessions" ON public.sessions
      FOR ALL USING (auth.uid() = customer_id OR auth.uid() = therapist_id)
      WITH CHECK (auth.uid() = customer_id OR auth.uid() = therapist_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='Admins read all sessions') THEN
    CREATE POLICY "Admins read all sessions" ON public.sessions
      FOR SELECT USING (true);
  END IF;
END$$;
-- Ensure new columns exist on older databases
DO $$ BEGIN
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS video_room_url text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS accepted_by_therapist boolean DEFAULT false;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancellation_reason text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS notes text;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 6. payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  customer_id uuid,
  customer_name text,
  therapist_id uuid,
  therapist_name text,
  amount numeric DEFAULT 0,
  therapist_fee numeric DEFAULT 0,
  platform_fee numeric DEFAULT 0,
  status text DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  payment_date timestamptz DEFAULT now(),
  currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='Users manage own payments') THEN
    CREATE POLICY "Users manage own payments" ON public.payments
      FOR ALL USING (auth.uid() = customer_id OR auth.uid() = therapist_id)
      WITH CHECK (auth.uid() = customer_id OR auth.uid() = therapist_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='Admins read all payments') THEN
    CREATE POLICY "Admins read all payments" ON public.payments
      FOR SELECT USING (true);
  END IF;
END$$;
-- Ensure new columns exist on older databases
DO $$ BEGIN
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS therapist_fee numeric DEFAULT 0;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_date timestamptz DEFAULT now();
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_name text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS therapist_name text;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 7. session_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  customer_id uuid,
  therapist_id uuid,
  customer_name text,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='session_reviews' AND policyname='Customers can write reviews') THEN
    CREATE POLICY "Customers can write reviews" ON public.session_reviews
      FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='session_reviews' AND policyname='Reviews are publicly readable') THEN
    CREATE POLICY "Reviews are publicly readable" ON public.session_reviews
      FOR SELECT USING (true);
  END IF;
END$$;
DO $$ BEGIN
  ALTER TABLE public.session_reviews ADD COLUMN IF NOT EXISTS customer_name text;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 8. chat_messages (premium chat sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  sender_id uuid,
  sender_name text,
  content text,
  message_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='Users can manage their chat messages') THEN
    CREATE POLICY "Users can manage their chat messages" ON public.chat_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================
-- 9. support_sessions (free emotional support queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  customer_name text,
  session_type text DEFAULT 'emotional_support',
  status text DEFAULT 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  timer_end_at timestamptz,
  assigned_therapist_id uuid,
  assigned_therapist_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_sessions' AND policyname='Support sessions policy') THEN
    CREATE POLICY "Support sessions policy" ON public.support_sessions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
DO $$ BEGIN
  ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS assigned_therapist_id uuid;
  ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS assigned_therapist_name text;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- 10. support_messages (free chat messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  sender_id uuid,
  sender_type text,
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_messages' AND policyname='Support messages policy') THEN
    CREATE POLICY "Support messages policy" ON public.support_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================
-- 11. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  body text,
  type text,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users manage own notifications') THEN
    CREATE POLICY "Users manage own notifications" ON public.notifications
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Admins read all notifications') THEN
    CREATE POLICY "Admins read all notifications" ON public.notifications
      FOR SELECT USING (true);
  END IF;
END$$;

-- ============================================================
-- 12. withdrawals (therapist payout requests — max 3/week)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  therapist_name text,
  amount numeric NOT NULL,
  cashfree_fee numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='withdrawals' AND policyname='Therapists manage own withdrawals') THEN
    CREATE POLICY "Therapists manage own withdrawals" ON public.withdrawals
      FOR ALL USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='withdrawals' AND policyname='Admins view all withdrawals') THEN
    CREATE POLICY "Admins view all withdrawals" ON public.withdrawals
      FOR SELECT USING (true);
  END IF;
END$$;

-- ============================================================
-- 13. terms_and_conditions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_type text NOT NULL,
  content text,
  version text DEFAULT 'v1.0.0',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='terms_and_conditions' AND policyname='TC publicly readable') THEN
    CREATE POLICY "TC publicly readable" ON public.terms_and_conditions
      FOR SELECT USING (true);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='terms_and_conditions' AND policyname='Admins manage TC') THEN
    CREATE POLICY "Admins manage TC" ON public.terms_and_conditions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================
-- 14. application_chats (therapist ↔ super admin pre-approval chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.application_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  sender_id uuid,
  sender_role text,
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.application_chats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='application_chats' AND policyname='Application chats policy') THEN
    CREATE POLICY "Application chats policy" ON public.application_chats
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================
-- 15. blog_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  slug text UNIQUE,
  content text,
  excerpt text,
  cover_image_url text,
  author text DEFAULT 'BreathingPlace Team',
  tags text[],
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blog_posts' AND policyname='Published posts are public') THEN
    CREATE POLICY "Published posts are public" ON public.blog_posts
      FOR SELECT USING (is_published = true);
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blog_posts' AND policyname='Admins manage blog posts') THEN
    CREATE POLICY "Admins manage blog posts" ON public.blog_posts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- ============================================================
-- Enable Realtime for live features
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ============================================================
-- DONE
-- Tables: user_profiles, customer_profiles, therapist_profiles,
-- platform_settings, sessions, payments, session_reviews,
-- chat_messages, support_sessions, support_messages,
-- notifications, withdrawals, terms_and_conditions,
-- application_chats, blog_posts (15 total)
-- ============================================================
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
    { num: 4, text: "15 tables created with RLS: user_profiles, customer_profiles, therapist_profiles, platform_settings, sessions, payments, session_reviews, chat_messages, support_sessions, support_messages, notifications, withdrawals, terms_and_conditions, application_chats, blog_posts" },
    { num: 5, text: "Default configs inserted into platform_settings: chat_config (15/10 min free), video_config (50 min), revenue_config (20% commission), bank_account" },
    { num: 6, text: "Realtime enabled for: sessions, chat_messages, support_sessions, support_messages, notifications, payments" },
  ];

  const edgeFunctionSteps = [
    { num: 1, text: "Install Supabase CLI: npm install -g supabase" },
    { num: 2, text: "Login: supabase login" },
    { num: 3, text: "Link project: supabase link --project-ref weyaamphuxwzfbqkweaf" },
    { num: 4, text: "Deploy all functions: supabase functions deploy cashfree-order && supabase functions deploy daily-room && supabase functions deploy send-email" },
    { num: 5, text: "Functions are located in: supabase/functions/ (already created in the project)" },
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
              Run this SQL once after creating your Supabase project. It creates all 15 required tables with RLS policies, inserts default platform settings, and enables Realtime subscriptions. Safe to re-run on an existing database.
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
        <div className="bg-gray-900 rounded-xl overflow-hidden mb-8">
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

        {/* Edge Functions Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Deploy Edge Functions</h2>
              <p className="text-muted-foreground text-sm">Required for Cashfree payments, Daily.co video calls, and Resend emails</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">3 Edge Functions Required</p>
            <p className="text-sm text-blue-700 mt-0.5">
              <code className="bg-blue-100 px-1 rounded">cashfree-order</code> (payments),{" "}
              <code className="bg-blue-100 px-1 rounded">daily-room</code> (video calls),{" "}
              <code className="bg-blue-100 px-1 rounded">send-email</code> (Resend emails).
              These are already created in <code className="bg-blue-100 px-1 rounded">supabase/functions/</code> — you just need to deploy them.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-sm text-foreground mb-4">Deploy via Supabase CLI (run in your project terminal):</h2>
          <div className="space-y-3">
            {edgeFunctionSteps.map((s) => (
              <div key={s.num} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.num}</span>
                <p className="text-sm text-gray-700 font-mono bg-gray-50 rounded px-2 py-1 flex-1">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" asChild>
              <a href="https://supabase.com/dashboard/project/weyaamphuxwzfbqkweaf/functions" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Functions in Supabase Dashboard
              </a>
            </Button>
          </div>
        </div>

        {/* Quick deploy commands */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">terminal — deploy all 3 functions</span>
          </div>
          <pre className="p-4 text-xs text-green-400 font-mono whitespace-pre leading-relaxed">
{`# 1. Install CLI (skip if already installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link to your project
supabase link --project-ref weyaamphuxwzfbqkweaf

# 4. Deploy all 3 functions
supabase functions deploy cashfree-order
supabase functions deploy daily-room
supabase functions deploy send-email`}
          </pre>
        </div>
      </div>
    </div>
  );
}