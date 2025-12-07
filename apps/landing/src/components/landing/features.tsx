
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Activity, Lock, Globe, Database, Terminal } from 'lucide-react';

const features = [
    {
        icon: Settings,
        title: "Visual Configuration",
        description: "Edit your Caddy configuration with a powerful visual editor or dive into the raw JSON/Caddyfile."
    },
    {
        icon: Activity,
        title: "Real-time Metrics",
        description: "Monitor your server performance, request rates, and error logs in real-time."
    },
    {
        icon: Lock,
        title: "Automatic TLS",
        description: "Leverage Caddy's automatic HTTPS. Manage certificates and domains effortlessly."
    },
    {
        icon: Globe,
        title: "Reverse Proxy Management",
        description: "Configure upstreams, load balancing, and headers with intuitive UI controls."
    },
    {
        icon: Database,
        title: "Zero Dependency",
        description: "Runs as a single binary alongside Caddy. No external databases required."
    },
    {
        icon: Terminal,
        title: "API First",
        description: "Built on top of Caddy's native API. Every action is a direct API call."
    }
];

export function Features() {
    return (
        <section id="features" className="py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Everything You Need</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Powerful features wrapped in a beautiful interface. Designed for developers who care about their tools.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <Card key={index} className="bg-card border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all">
                            <CardHeader>
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <feature.icon className="h-6 w-6 text-emerald-400" />
                                </div>
                                <CardTitle className="text-foreground text-xl">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base text-muted-foreground/80">
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
