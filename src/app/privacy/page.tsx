import { redirect } from "next/navigation";

// The canonical Privacy Policy is a static, first-party document served from
// /public. The /privacy route redirects to it so every internal "Privacy" link
// (footer, age gate, Terms) stays in one place.
const PRIVACY_POLICY_PATH = "/pomodoro_privacy_policy.html";

export default function PrivacyPage() {
    redirect(PRIVACY_POLICY_PATH);
}
