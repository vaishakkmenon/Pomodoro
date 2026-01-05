export async function requestNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return false;

    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    const result = await Notification.requestPermission();
    return result === "granted";
}

export function sendNotification(title: string, body?: string) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
        new Notification(title, {
            body,
            icon: "/icon.png", // Ensure this exists or use a default
        });
    } catch (e) {
        console.error("Notification failed", e);
    }
}
