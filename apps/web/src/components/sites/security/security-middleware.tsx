"use client";

import { Package, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { type MiddlewareSettings } from "@/lib/api";

interface SecurityMiddlewareProps {
    middleware: MiddlewareSettings;
    onUpdateMiddleware: (settings: Partial<MiddlewareSettings>) => Promise<void>;
}

export function SecurityMiddleware({ middleware, onUpdateMiddleware }: SecurityMiddlewareProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                        Compression
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Compress responses affecting bandwidth and latency (Gzip/Zstd)
                    </p>
                </div>
                <Switch
                    checked={middleware.compression_enabled}
                    onCheckedChange={(checked) => onUpdateMiddleware({ compression_enabled: checked })}
                />
            </div>

            {middleware.compression_enabled && (
                <div className="space-y-6 p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Compression Level ({middleware.compression_level})</Label>
                            <span className="text-xs text-muted-foreground">Higher = smaller size, more CPU</span>
                        </div>
                        <Slider
                            value={[middleware.compression_level]}
                            min={1}
                            max={9}
                            step={1}
                            onValueChange={(value: number[]) => onUpdateMiddleware({ compression_level: value[0] })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
