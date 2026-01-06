import { User } from "@/types/auth";

export function useSiteAuth() {
    return {
        user: null as User | null,
        isPremium: false,
        isLoading: false,
        signInWithMagicLink: async () => { },
        login: async () => { },
        loginWithPassword: async () => { },
        signupWithPassword: async () => { },
        resetPassword: async () => { },
        error: null as string | null,
        clearError: () => { },
        logout: async () => { },
    };
}
