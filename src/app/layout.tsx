import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import { CustomUserMenu } from "@/components/auth/CustomUserMenu";
import { ThemeProvider } from "@/hooks/useTheme";
import { currentUser } from "@clerk/nextjs/server";
import "./globals.css";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
    title: "Pomodoro Timer",
    description: "A simple Pomodoro timer",
    icons: {
        icon: "/favicon.svg",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await currentUser();
    const isOwner = user?.emailAddresses.some(email => email.emailAddress === process.env.OWNER_EMAIL) ?? false;

    return (
        <ClerkProvider>
            <html lang="en">
                <body className="antialiased">
                    <ThemeProvider>
                        <header className="flex justify-end items-center p-4 gap-4 h-16 absolute top-0 right-0 z-50">
                            <CustomUserMenu isOwner={isOwner} />
                        </header>
                        {children}
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
