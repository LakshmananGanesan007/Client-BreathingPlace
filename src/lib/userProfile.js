/**
 * Supabase user_profiles helper.
 * All selected_role / profile_status reads & writes go here.
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   create table if not exists public.user_profiles (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid unique not null,
 *     email text,
 *     selected_role text,
 *     profile_status text default 'pending',
 *     approval_status text,
 *     last_completed_step int default 0,
 *     total_steps int default 0,
 *     step_data jsonb default '{}',
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 *   alter table public.user_profiles enable row level security;
 *   create policy "Users manage own profile" on public.user_profiles
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */

import { supabase } from '@/lib/supabaseClient';

function toUUID(id) {
  if (!id) return id;
  if (id.includes('-')) return id;
  const hex = id.replace(/[^a-f0-9]/gi, '');
  if (hex.length === 24) {
    const p = hex.padEnd(32, '0');
    return `${p.slice(0,8)}-${p.slice(8,12)}-${p.slice(12,16)}-${p.slice(16,20)}-${p.slice(20)}`;
  }
  return id;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', toUUID(userId))
    .maybeSingle();
  if (error) {
    console.error('[getUserProfile] error:', error);
    throw error;
  }
  return data;
}

import { base44 } from '@/api/base44Client';

export async function upsertUserProfile(userId, email, fields) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await base44.functions.invoke('saveProfileData', {
      userProfileData: { email, ...fields },
      supabaseToken: session?.access_token
    });
    
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[upsertUserProfile] error:', error);
    throw error;
  }
}

/**
 * Save progress after completing a step.
 * Merges new step data into the existing step_data JSON blob.
 */
export async function saveStepProgress(userId, email, { stepNumber, totalSteps, stepData = {}, role }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await base44.functions.invoke('saveProfileData', {
      userProfileData: {
        email,
        selected_role: role,
        profile_status: 'pending',
        last_completed_step: stepNumber,
        total_steps: totalSteps,
        step_data: stepData,
      },
      supabaseToken: session?.access_token
    });

    if (response.data?.error) {
      throw new Error(response.data.error);
    }

    return { success: true };
  } catch (error) {
    console.error('[saveStepProgress] error:', error);
    throw error;
  }
}