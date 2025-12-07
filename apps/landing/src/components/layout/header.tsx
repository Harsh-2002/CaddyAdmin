
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                    <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">CaddyAdmin</span>
                </Link>
                <nav className="flex items-center gap-6">
                    <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                        Features
                    </Link>
                    <Link href="#github" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                        GitHub
                    </Link>
                    <Button variant="default" size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                        Get Started
                    </Button>
                </nav>
            </div>
        </header>
    );
}
