"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Shield, Sparkles, Activity, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function WelcomeHero() {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-2xl ring-1 ring-white/10 min-h-[calc(100vh-10rem)] flex items-center">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:30px_30px] opacity-20 mask-gradient" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 w-full px-8 py-8 md:py-12 md:px-16 grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-semibold shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Sparkles className="w-4 h-4 fill-indigo-400 text-indigo-400" />
                            <span>Ready to scale</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
                    >
                        Modern Infrastructure <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                            Made Simple.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg text-slate-400 mb-10 max-w-xl leading-relaxed"
                    >
                        Caddy Admin gives you complete control over your reverse proxy. Configure sites, manage SSL/TLS, and monitor traffic with a beautiful, intuitive interface.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4"
                    >
                        <Link href="/sites">
                            <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-14 px-8 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95">
                                <Globe className="mr-2 w-5 h-5" />
                                Create First Site
                            </Button>
                        </Link>
                        <Link href="/upstreams">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-xl border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all">
                                <Server className="mr-2 w-5 h-5" />
                                Configure Upstreams
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Feature Grid (Right Side or Bottom) */}
                <div className="relative hidden lg:block">
                    <div className="relative z-10 grid gap-6">
                        {[
                            { icon: Globe, title: "Reverse Proxy", desc: "Route traffic instantly", color: "bg-blue-500" },
                            { icon: Shield, title: "Auto HTTPS", desc: "Managed certificates", color: "bg-emerald-500" },
                            { icon: Activity, title: "Live Insights", desc: "Real-time traffic metrics", color: "bg-violet-500" },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                            >
                                <div className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl hover:bg-slate-800/60 transition-all cursor-default shadow-lg hover:shadow-xl hover:-translate-y-1">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    <div className="flex items-center gap-5">
                                        <div className={`p-3.5 rounded-xl ${item.color}/10 text-${item.color.split("-")[1]}-400 ring-1 ring-${item.color.split("-")[1]}-500/20 group-hover:ring-${item.color.split("-")[1]}-500/40 transition-all`}>
                                            <item.icon className={`w-6 h-6 ${item.color.replace('bg-', 'text-')}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg tracking-tight">{item.title}</h3>
                                            <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                                            <ArrowRight className="w-5 h-5 text-slate-500" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {/* Decorative behind elements - Refined */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse-slow delay-700" />
                </div>
            </div>
        </div>
    );
}
