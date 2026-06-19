import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";

export const ADMIN_DATA_KEY = ["supabase-admin-data"];

export function useAdminData() {
  return useQuery({
    queryKey: ADMIN_DATA_KEY,
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        throw new Error("Supabase auth session is missing or expired. Please refresh the page or log in again.");
      }
      
      try {
        const res = await base44.functions.invoke('adminGetDashboardData', {
          supabaseToken: session.access_token
        });
        if (res.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data;
      } catch (err) {
        // If it's a 401, it means the token is invalid/expired
        if (err.message?.includes('401') || err.response?.status === 401) {
          throw new Error("Your session has expired. Please log out and log back in.");
        }
        throw err;
      }
    },
    staleTime: 0,
    retry: 1,
  });
}

export async function updateTherapistStatus(userId, status, reason) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await base44.functions.invoke('adminGetDashboardData', {
      action: 'updateTherapistStatus',
      userId,
      status,
      reason,
      supabaseToken: session?.access_token
    });
    return res.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

export async function updateTherapistMarkup(userId, markupPercentage) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await base44.functions.invoke('adminGetDashboardData', {
      action: 'updateTherapistFee',
      userId,
      markupPercentage,
      supabaseToken: session?.access_token
    });
    return res.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}