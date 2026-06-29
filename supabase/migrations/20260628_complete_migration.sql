-- ============================================================
-- BreathingPlace Complete Migration
-- Date: 2026-06-28
-- Run this in your Supabase SQL editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. support_sessions — add therapist approval columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE support_sessions
  ADD COLUMN IF NOT EXISTS approved_by_therapist_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS timer_start_at TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────
-- 2. system_logs — activity log for Admin Logs page
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','success','warning','error')),
  message       TEXT NOT NULL,
  metadata      JSONB,
  user_id       UUID REFERENCES auth.users(id),
  source        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);

-- RLS for system_logs: only super admins can read
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can read system logs"
  ON system_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.selected_role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "System can insert logs"
  ON system_logs FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 3. notifications — for therapist session request notifications
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT,
  related_id    UUID,
  is_read       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 4. platform_settings — ensure chat_config row exists
-- ──────────────────────────────────────────────────────────────
INSERT INTO platform_settings (setting_type, setting_value)
VALUES (
  'chat_config',
  '{
    "free_minutes_new": 15,
    "free_minutes_returning": 10,
    "paid_duration_minutes": 20,
    "paid_amount": 150,
    "therapist_share": 100,
    "admin_share": 50
  }'::jsonb
)
ON CONFLICT (setting_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 5. Indexes for performance
-- ──────────────────────────────────────────────────────────────
-- support_sessions: therapist lookup (used in TherapistDashboard)
CREATE INDEX IF NOT EXISTS idx_support_sessions_therapist_status
  ON support_sessions(assigned_therapist_id, status);

-- support_sessions: customer lookup
CREATE INDEX IF NOT EXISTS idx_support_sessions_customer_id
  ON support_sessions(customer_id);

-- support_messages: session lookup (used in FreeSupportChat)
CREATE INDEX IF NOT EXISTS idx_support_messages_session_id
  ON support_messages(session_id, created_at);

-- sessions: therapist lookup
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id
  ON sessions(therapist_id, session_date DESC);

-- sessions: customer lookup
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id
  ON sessions(customer_id, session_date DESC);

-- ──────────────────────────────────────────────────────────────
-- 6. RLS fix: support_sessions readable by assigned therapist
-- ──────────────────────────────────────────────────────────────
-- Allow therapists to read sessions assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_sessions'
      AND policyname = 'Therapists can read assigned sessions'
  ) THEN
    CREATE POLICY "Therapists can read assigned sessions"
      ON support_sessions FOR SELECT
      USING (
        assigned_therapist_id = auth.uid()
        OR customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.selected_role IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Allow therapists to update sessions assigned to them (for approval)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_sessions'
      AND policyname = 'Therapists can update assigned sessions'
  ) THEN
    CREATE POLICY "Therapists can update assigned sessions"
      ON support_sessions FOR UPDATE
      USING (
        assigned_therapist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.selected_role IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 7. Helper function: log system events
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_system_event(
  p_event_type TEXT,
  p_level      TEXT,
  p_message    TEXT,
  p_metadata   JSONB DEFAULT NULL,
  p_user_id    UUID DEFAULT NULL,
  p_source     TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO system_logs(event_type, level, message, metadata, user_id, source)
  VALUES (p_event_type, p_level, p_message, p_metadata, p_user_id, p_source);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 8. Trigger: auto-log support session events
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_log_support_session()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_system_event(
      'free_support_started', 'info',
      format('Free chat request created — Customer: %s, Type: %s',
        COALESCE(NEW.customer_name, 'Unknown'), COALESCE(NEW.session_type, 'General')),
      row_to_json(NEW)::jsonb, NEW.customer_id, 'support_sessions'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status THEN
      PERFORM log_system_event(
        CASE NEW.status
          WHEN 'active' THEN 'free_support_started'
          WHEN 'completed' THEN 'free_support_completed'
          WHEN 'cancelled' THEN 'session_cancelled'
          ELSE 'session_updated'
        END,
        CASE NEW.status WHEN 'cancelled' THEN 'warning' WHEN 'completed' THEN 'success' ELSE 'info' END,
        format('Free chat %s — Customer: %s', NEW.status, COALESCE(NEW.customer_name, 'Unknown')),
        row_to_json(NEW)::jsonb, NEW.customer_id, 'support_sessions'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_support_session_events ON support_sessions;
CREATE TRIGGER log_support_session_events
  AFTER INSERT OR UPDATE ON support_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_log_support_session();

-- ──────────────────────────────────────────────────────────────
-- 9. Trigger: auto-log payment events
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_log_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
    PERFORM log_system_event(
      CASE NEW.status
        WHEN 'completed' THEN 'payment_completed'
        WHEN 'failed' THEN 'payment_failed'
        ELSE 'payment_initiated'
      END,
      CASE NEW.status WHEN 'failed' THEN 'error' WHEN 'completed' THEN 'success' ELSE 'info' END,
      format('Payment %s — ₹%s via %s', NEW.status, COALESCE(NEW.amount::text, '0'), COALESCE(NEW.payment_method, 'Cashfree')),
      row_to_json(NEW)::jsonb, NEW.customer_id, 'payments'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_payment_events ON payments;
CREATE TRIGGER log_payment_events
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_log_payment();
