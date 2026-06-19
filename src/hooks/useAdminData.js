import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export const ADMIN_DATA_KEY = ["supabase-admin-data"];

export function useAdminData() {
  return useQuery({
    queryKey: ADMIN_DATA_KEY,
    queryFn: async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error("Supabase auth session is missing or expired. Please refresh the page or log in again.");
      }

      try {
        // Fetch all required data directly from your Supabase tables
        // Supabase natively handles errors by returning them in the response object
        const [
          customersRes,
          therapistsRes,
          userProfilesRes,
          sessionsRes,
          paymentsRes
        ] = await Promise.all([
          supabase.from('customer_profiles').select('*'),
          supabase.from('therapist_profiles').select('*'),
          supabase.from('user_profiles').select('*'),
          supabase.from('sessions').select('*'),
          supabase.from('payments').select('*')
        ]);

        // If a table doesn't exist yet, 'data' will be null, so we safely fallback to an empty array []
        const customers = customersRes.data || [];
        const therapists = therapistsRes.data || [];
        const userProfiles = userProfilesRes.data || [];
        const sessions = sessionsRes.data || [];
        const payments = paymentsRes.data || [];

        // Return the exact structure expected by your Admin UI components
        return {
          customers,
          therapists,
          userProfiles,
          sessions,
          payments,
          totalCustomers: customers.length,
          totalTherapists: therapists.length,
          pendingApprovals: therapists.filter(t => t.approval_status === 'pending').length,
          totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
        };
      } catch (err) {
        console.error("Dashboard database fetch failure:", err);
        throw err;
      }
    },
    staleTime: 0,
    retry: 1,
  });
}

export async function updateTherapistStatus(userId, status, reason) {
  try {
    const { error } = await supabase
      .from('therapist_profiles')
      .update({ 
        approval_status: status,
        rejection_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
    
    // Sync status update to user_profiles table 
    await supabase
      .from('user_profiles')
      .update({ approval_status: status })
      .eq('user_id', userId);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function updateTherapistMarkup(userId, markupPercentage) {
  try {
    const { error } = await supabase
      .from('therapist_profiles')
      .update({ 
        consultation_fee: markupPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}