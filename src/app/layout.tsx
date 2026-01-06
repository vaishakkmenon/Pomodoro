import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import { CustomUserMenu } from "@/components/auth/CustomUserMenu";
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
        <ClerkProvider>
            <html lang="en">
                <body className="antialiased">
                    <header className="flex justify-end items-center p-4 gap-4 h-16 absolute top-0 right-0 z-50">
                        <CustomUserMenu />
                    </header>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}
