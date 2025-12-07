
import { Button } from '@/components/ui/button';
import { Github, Star } from 'lucide-react';

export function GitHub() {
    const starCount = "1.2k";

    return (
        <section id="github" className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center flex flex-col items-center">
                <div className="h-16 w-16 mb-6 rounded-full bg-foreground text-background flex items-center justify-center">
                    <Github className="h-8 w-8" />
                </div>

                <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Open Source at Heart</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mb-10">
                    Transparency is key. We are fully open source and driven by the community. Join us on GitHub to contribute, report issues, or just star the repo.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button size="lg" variant="secondary" className="h-12 px-8 font-medium gap-2">
                        <Github className="h-5 w-5" />
                        View Repository
                    </Button>
                    <div className="flex items-center h-12 px-4 rounded-md bg-white/5 border border-white/10 text-sm font-mono text-muted-foreground">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        {starCount} stars
                    </div>
                </div>
            </div>
        </section>
    );
}
