import type { Metadata } from "next";
import Link from "next/link";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
    title: "Terms of Service — Pomodoro Timer",
    description: "The terms that govern your use of the app, including eligibility.",
};

const CONTACT_EMAIL = "support@vaishakmenon.com";
const LAST_UPDATED = "May 31, 2026";

export default function TermsPage() {
    return (
        <main className="min-h-screen w-full bg-zinc-950 text-white/80 px-6 py-16">
            <article className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
                    <p className="text-sm text-white/40 mt-1">Last updated: {LAST_UPDATED}</p>
                </div>

                <p>
                    By accessing or using the Pomodoro Timer application (the &quot;Service&quot;),
                    you agree to these Terms of Service. If you do not agree, do not use the Service.
                </p>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">Eligibility</h2>
                    <p>
                        By creating an account, you affirm that you are at least 16 years of age. The
                        Service is not intended for children under 16, and they are not permitted to
                        create an account or otherwise provide personal information. See our{" "}
                        <Link href="/privacy" className="text-white underline">
                            Privacy Policy
                        </Link>{" "}
                        for our children&apos;s privacy commitments.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">Accounts</h2>
                    <p>
                        You are responsible for the activity that occurs under your account and for
                        keeping your login credentials secure. Accounts are managed through our
                        authentication provider, Clerk.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">Acceptable Use</h2>
                    <p>
                        You agree not to misuse the Service, including by attempting to disrupt it,
                        access it through unauthorized means, or use it in violation of applicable
                        law.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">Disclaimer</h2>
                    <p>
                        The Service is provided &quot;as is&quot; without warranties of any kind. We
                        do not guarantee that the Service will be uninterrupted or error-free.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-semibold text-white">Contact</h2>
                    <p>
                        Questions about these terms can be sent to{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline">
                            {CONTACT_EMAIL}
                        </a>
                        .
                    </p>
                </section>

                <div className="pt-4 border-t border-white/10">
                    <Link href="/" className="text-sm text-white/50 hover:text-white underline">
                        ← Back to app
                    </Link>
                    <span className="mx-2 text-white/20">·</span>
                    <Link href="/privacy" className="text-sm text-white/50 hover:text-white underline">
                        Privacy Policy
                    </Link>
                </div>
            </article>
        </main>
    );
}
