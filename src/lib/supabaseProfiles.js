/**
 * Supabase helpers for customer_profiles and therapist_profiles tables.
 *
 * Run these SQL statements once in your Supabase SQL editor:
 *
 * -- Customer profiles
 * create table if not exists public.customer_profiles (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid unique not null references auth.users(id) on delete cascade,
 *   full_name text,
 *   gender text,
 *   dob text,
 *   address text,
 *   phone text,
 *   occupation text,
 *   relationship_status text,
 *   preferred_language text,
 *   profile_photo_url text,
 *   main_concerns text[],
 *   previous_therapy boolean default false,
 *   current_medication text,
 *   anxiety_level text,
 *   stress_level text,
 *   sleep_quality text,
 *   depression_history boolean default false,
 *   emergency_contact text,
 *   preferred_therapist_gender text,
 *   preferred_session_time text,
 *   profile_complete boolean default false,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * alter table public.customer_profiles enable row level security;
 * create policy "Users manage own customer profile"
 *   on public.customer_profiles for all
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 *
 * -- Therapist profiles
 * create table if not exists public.therapist_profiles (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid unique not null references auth.users(id) on delete cascade,
 *   full_name text,
 *   phone text,
 *   bio text,
 *   qualification text,
 *   experience_years int default 0,
 *   specializations text[],
 *   languages text[],
 *   profile_photo_url text,
 *   gov_id_url text,
 *   certificates_url text,
 *   license_url text,
 *   approval_status text default 'pending',
 *   available_days text[],
 *   available_times text[],
 *   consultation_fee numeric default 0,
 *   currency text default 'INR',
 *   profile_complete boolean default false,
 *   slug text,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * alter table public.therapist_profiles enable row level security;
 * create policy "Users manage own therapist profile"
 *   on public.therapist_profiles for all
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 * -- Allow approved therapist profiles to be read publicly (for directory)
 * create policy "Approved therapist profiles are public"
 *   on public.therapist_profiles for select
 *   using (approval_status = 'approved');
 */

import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';

export async function upsertCustomerProfile(userId, data) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await base44.functions.invoke('saveProfileData', {
      customerData: data,
      supabaseToken: session?.access_token
    });
    
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[upsertCustomerProfile] error:', error);
    throw error;
  }
}

export async function upsertTherapistProfile(userId, data) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await base44.functions.invoke('saveProfileData', {
      therapistData: data,
      supabaseToken: session?.access_token
    });
    
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[upsertTherapistProfile] error:', error);
    throw error;
  }
}