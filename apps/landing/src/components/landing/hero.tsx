"use client";

import { Button } from '@/components/ui/button';
import { ArrowRight, Server, Shield, Activity, Settings, FileJson, ShieldCheck } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative pt-16 pb-16 md:pt-24 md:pb-24 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10 flex flex-col items-center text-center">
                {/* Brand + Beta Badge */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            Caddy Admin
                        </span>
                    </div>
                    <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                        Open Source · Public Beta
                    </div>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 max-w-4xl leading-tight">
                    Master Your Caddy Server with{' '}
                    <span className="text-emerald-400">Precision</span>
                </h1>

                {/* Subheadline */}
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed px-4">
                    The powerful, open-source GUI for Caddy. Manage sites, visualize metrics, and edit JSON configurations with a premium, developer-first experience.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base border-white/10 hover:bg-white/5 text-foreground">
                        View on GitHub
                    </Button>
                </div>

                {/* Premium Mockup */}
                <div className="relative w-full max-w-5xl">
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-transparent to-purple-500/20 rounded-2xl blur-2xl opacity-50"></div>

                    {/* Browser Window */}
                    <div className="relative rounded-xl border border-white/10 bg-card shadow-2xl overflow-hidden">
                        {/* Browser Toolbar */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/60"></div>
                            </div>
                            <div className="flex-1 mx-4 h-7 rounded-md bg-white/5 text-xs text-muted-foreground flex items-center justify-center px-3 font-mono">
                                <Shield className="h-3 w-3 mr-2 text-emerald-400" />
                                admin.caddy.local
                            </div>
                            <div className="w-16"></div>
                        </div>

                        {/* App Content */}
                        <div className="flex min-h-[300px] sm:min-h-[350px] bg-background text-left">
                            {/* Sidebar */}
                            <div className="hidden md:flex flex-col w-48 border-r border-border/50 bg-muted/20 p-3 gap-1">
                                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Menu</div>
                                {[
                                    { icon: Server, label: 'Sites', active: true },
                                    { icon: Settings, label: 'Config', active: false },
                                    { icon: FileJson, label: 'Logs', active: false },
                                    { icon: Activity, label: 'System', active: false },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${item.active
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </div>
                                ))}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 flex flex-col">
                                {/* Dashboard Header */}
                                <div className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/50">
                                    <div className="font-semibold text-sm">Sites Overview</div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <div className="text-xs text-muted-foreground">Caddy v2.9.0</div>
                                    </div>
                                </div>

                                {/* Dashboard Content */}
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold tracking-tight">Active Routes</h2>
                                            <p className="text-xs text-muted-foreground">Manage your server routes and handlers.</p>
                                        </div>
                                        <div className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-medium rounded-md flex items-center transition-colors cursor-default">
                                            + New Route
                                        </div>
                                    </div>

                                    {/* Site Cards Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { name: 'api.server.com', type: 'Reverse Proxy', status: 'Healthy', load: '45ms' },
                                            { name: 'cdn.assets.io', type: 'File Server', status: 'Healthy', load: '12ms' },
                                            { name: 'auth.service', type: 'Authentication', status: 'Idle', load: '-' },
                                        ].map((site, i) => (
                                            <div key={i} className="group rounded-lg border border-border/50 bg-card p-4 hover:border-emerald-500/30 transition-all shadow-sm">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                                            <Server className="h-3 w-3" />
                                                        </div>
                                                        <span className="font-medium text-sm">{site.name}</span>
                                                    </div>
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Type</span>
                                                        <span className="text-foreground">{site.type}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Latency</span>
                                                        <span className="text-emerald-500 font-mono">{site.load}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </section>
    );
}
