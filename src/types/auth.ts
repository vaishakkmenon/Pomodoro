export interface User {
    id: string;
    email?: string;
}

export interface SiteAuthState {
    user: User | null;
    isPremium: boolean;
    isLoading: boolean;
}

export interface PremiumCheckResult {
    isPremium: boolean;
    isActive: boolean;
}
