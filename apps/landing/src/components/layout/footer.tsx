"use client";

import { Heart } from 'lucide-react';

export function Footer() {
    return (
        <footer className="w-full border-t border-white/5 py-12 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col items-center gap-6 text-center">
                <div className="flex flex-col gap-2">
                    <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        Made with <Heart className="h-4 w-4 text-emerald-500 fill-emerald-500" /> for the <span className="text-foreground font-medium">Caddy Community</span>
                    </p>
                    <p className="text-xs text-muted-foreground/40 font-mono">
                        © {new Date().getFullYear()} CaddyAdmin · Open Source
                    </p>
                </div>
            </div>
        </footer>
    );
}
