
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { GitHub } from "@/components/landing/github";
import { Waitlist } from "@/components/landing/waitlist";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500/30">
      <main>
        <Hero />
        <Features />
        <GitHub />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
