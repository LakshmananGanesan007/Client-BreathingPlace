import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export const useSessionConfig = () => {
  return useQuery({
    queryKey: ["platform-chat-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_type", "chat_config")
        .maybeSingle();
      
      // Fallback constants if database is empty
      const defaults = {
        free_minutes_new: 15,
        free_minutes_returning: 10,
        paid_duration_minutes: 20,
        paid_amount: 149
      };
      return data?.setting_value || defaults;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};