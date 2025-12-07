"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { SSEProvider } from "@/contexts/sse-context";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <SSEProvider subscriptions={["metrics", "sites", "config"]}>
            <div className="flex min-h-screen">
                <AppSidebar />
                <main className="flex-1 overflow-auto bg-background">
                    <div className="container mx-auto p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </SSEProvider>
    );
}
