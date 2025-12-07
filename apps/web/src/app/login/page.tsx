"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LoginPage() {
    const { login, isLoading: authLoading } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginDuration, setLoginDuration] = useState(0);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        setLoginDuration(0);

        const startTime = Date.now();
        const progressInterval = setInterval(() => {
            setLoginDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        try {
            await login(username, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid credentials");
        } finally {
            clearInterval(progressInterval);
            setIsSubmitting(false);
            setLoginDuration(0);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-gray-950">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 items-center justify-center p-12">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent" />

                <div className="relative z-10 max-w-lg text-white space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 mb-8"
                    >
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <Image src="/favicon.png" alt="Caddy Logo" width={48} height={48} className="w-8 h-8" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">CaddyAdmin</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-extrabold leading-tight tracking-tight"
                    >
                        Manage your infrastructure with confidence.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-blue-100/90 leading-relaxed"
                    >
                        A powerful, modern interface for the Caddy web server.
                        Effortless reverse proxying, automatic HTTPS, and real-time metrics.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="grid gap-4 mt-8"
                    >
                        {[
                            "Automatic HTTPS with Let's Encrypt",
                            "Real-time Metrics Dashboard",
                            "Zero-downtime Config Reloads",
                            "Secure Environment-based Auth"
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-cyan-300" />
                                <span className="font-medium">{feature}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center p-8 bg-gray-950 text-white relative">
                <div className="w-full max-w-md space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center lg:text-left"
                    >
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Image src="/favicon.png" alt="Caddy Logo" width={48} height={48} className="w-8 h-8" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground mt-2">
                            Enter your credentials to access the admin dashboard.
                        </p>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                        >
                            {error && (
                                <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-400">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                    className="bg-gray-900 border-gray-800 focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="bg-gray-900 border-gray-800 focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Button
                                type="submit"
                                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-900/20"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {loginDuration > 3
                                            ? `Authenticating... (${loginDuration}s)`
                                            : "Authenticating..."}
                                    </>
                                ) : (
                                    <>
                                        Sign in to Dashboard
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </form>


                </div>
            </div>
        </div>
    );
}
