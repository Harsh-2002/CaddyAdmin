"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

export function Waitlist() {
    return (
        <section className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 sm:p-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Join the Waitlist</h2>
                    <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                        Be the first to know when we launch 1.0. Get early access to premium features and community updates.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                className="pl-10 h-12 bg-black/30 border-white/10 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-emerald-500/50"
                            />
                        </div>
                        <Button size="lg" type="submit" className="h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                            Subscribe
                        </Button>
                    </form>

                    <p className="mt-4 text-xs text-muted-foreground">
                        No spam. Unsubscribe at any time.
                    </p>
                </div>
            </div>
        </section>
    );
}
