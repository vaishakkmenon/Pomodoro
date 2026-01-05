import type { Metadata } from "next";
import "./globals.css";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
    title: "Pomodoro Timer",
    description: "A simple Pomodoro timer",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
