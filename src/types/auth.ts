import type { User } from "@supabase/supabase-js";

export interface SiteAuthState {
    user: User | null;
    isPremium: boolean;
    isLoading: boolean;
}

export interface PremiumCheckResult {
    isPremium: boolean;
    isActive: boolean;
}
