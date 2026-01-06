import { useState, useEffect } from "react";
import { getPremiumStatus } from "@/app/actions/user";
import { useUser } from "@clerk/nextjs";

export function usePremium() {
    const { isLoaded, isSignedIn } = useUser();
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function check() {
            if (!isLoaded) return;

            if (!isSignedIn) {
                if (mounted) {
                    setIsPremium(false);
                    setLoading(false);
                }
                return;
            }

            try {
                const status = await getPremiumStatus();
                if (mounted) setIsPremium(status);
            } catch (err) {
                console.error(err);
                if (mounted) setIsPremium(false);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        check();

        return () => {
            mounted = false;
        };
    }, [isLoaded, isSignedIn]);

    return { isPremium, loading };
}
