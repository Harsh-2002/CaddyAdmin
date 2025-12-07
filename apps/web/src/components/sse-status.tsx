"use client";

import { useSSE } from "@/contexts/sse-context";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SSEStatusProps {
    className?: string;
    showLabel?: boolean;
}

export function SSEStatus({ className, showLabel = false }: SSEStatusProps) {
    const { connectionStatus, lastHeartbeat, clientCount } = useSSE();

    const getStatusInfo = () => {
        switch (connectionStatus) {
            case "connected":
                return {
                    icon: Wifi,
                    color: "text-green-500",
                    bg: "bg-green-500/10",
                    label: "Connected",
                    description: `Real-time updates active${clientCount > 0 ? ` (${clientCount} clients)` : ""}`,
                };
            case "connecting":
                return {
                    icon: Loader2,
                    color: "text-yellow-500",
                    bg: "bg-yellow-500/10",
                    label: "Connecting",
                    description: "Establishing connection...",
                    animate: true,
                };
            case "error":
                return {
                    icon: WifiOff,
                    color: "text-red-500",
                    bg: "bg-red-500/10",
                    label: "Disconnected",
                    description: "Connection lost. Reconnecting...",
                };
            default:
                return {
                    icon: WifiOff,
                    color: "text-muted-foreground",
                    bg: "bg-muted",
                    label: "Offline",
                    description: "Not connected",
                };
        }
    };

    const status = getStatusInfo();
    const Icon = status.icon;

    const lastHeartbeatFormatted = lastHeartbeat
        ? `Last heartbeat: ${Math.round((Date.now() - lastHeartbeat) / 1000)}s ago`
        : "";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-md cursor-default",
                        status.bg,
                        className
                    )}
                >
                    <Icon
                        className={cn(
                            "w-4 h-4",
                            status.color,
                            status.animate && "animate-spin"
                        )}
                    />
                    {showLabel && (
                        <span className={cn("text-xs font-medium", status.color)}>
                            {status.label}
                        </span>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">
                <div className="text-sm">
                    <p className="font-medium">{status.description}</p>
                    {lastHeartbeatFormatted && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {lastHeartbeatFormatted}
                        </p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
