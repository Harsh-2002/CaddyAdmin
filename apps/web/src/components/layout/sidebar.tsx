"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Globe,
    Server,
    Settings,
    History,
    LayoutDashboard,
    ChevronRight,
    Zap,
    Layers,
    ScrollText,
    FileCode,
    PanelLeft,
    Activity,
    Shield,
    LogOut,
    User,
    Lock,
    Shuffle,
    Route,
    Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, color: "text-sky-500" },
    { name: "Sites", href: "/sites", icon: Globe, color: "text-blue-600" },
    { name: "Upstreams", href: "/upstreams", icon: Server, color: "text-emerald-500" },
    { name: "Groups", href: "/upstream-groups", icon: Layers, color: "text-teal-500" },
    { name: "Redirects", href: "/redirects", icon: Route, color: "text-orange-500" },
    { name: "Rewrites", href: "/rewrites", icon: Shuffle, color: "text-pink-500" },
    { name: "Security", href: "/security", icon: Shield, color: "text-red-600" },
    { name: "SSL", href: "/ssl", icon: Lock, color: "text-green-600" },
    { name: "DNS", href: "/dns-providers", icon: Network, color: "text-violet-500" },
    { name: "Metrics", href: "/metrics", icon: Activity, color: "text-indigo-500" },
    { name: "Logs", href: "/logs", icon: ScrollText, color: "text-amber-500" },
    { name: "Config", href: "/config", icon: FileCode, color: "text-slate-500" },
    { name: "History", href: "/history", icon: History, color: "text-stone-500" },
    { name: "Settings", href: "/settings", icon: Settings, color: "text-gray-500" },
];

export function AppSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = React.useState(false);
    const { username, logout, isAuthenticated } = useAuth();

    // Don't render sidebar on login page
    if (pathname === "/login") {
        return null;
    }

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo & Toggle */}
                {/* Header with Toggle */}
                <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border", collapsed ? "justify-center" : "justify-between")}>
                    {!collapsed && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center shrink-0">
                                <Image src="/favicon.png" alt="Caddy Logo" width={32} height={32} className="w-8 h-8" />
                            </div>
                            <span className="text-lg font-bold text-sidebar-foreground truncate tracking-tight">
                                Caddy Admin
                            </span>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn("text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed ? "" : "")}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive =
                            item.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(item.href);

                        const linkContent = (
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );

                        if (collapsed) {
                            return (
                                <Tooltip key={item.name}>
                                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                    <TooltipContent side="right" className="font-medium">
                                        {item.name}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return <div key={item.name}>{linkContent}</div>;
                    })}
                </nav>

                <Separator className="bg-sidebar-border/50" />

                {/* User Section */}
                {isAuthenticated && (
                    <div className={cn(
                        "p-3 border-t border-sidebar-border",
                        collapsed ? "flex flex-col items-center gap-2" : "space-y-2"
                    )}>
                        <div className={cn(
                            "flex items-center gap-2 text-sm text-sidebar-foreground",
                            collapsed && "justify-center"
                        )}>
                            <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md border border-white/10 shrink-0">
                                    {username ? username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#26282C] rounded-full shadow-sm"></span>
                            </div>
                            {!collapsed && (
                                <span className="truncate font-medium">{username}</span>
                            )}
                        </div>
                        {collapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={logout}
                                        className="text-muted-foreground hover:text-red-400"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Logout</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={logout}
                                className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        )}
                    </div>
                )}


            </aside>
        </TooltipProvider>
    );
}
