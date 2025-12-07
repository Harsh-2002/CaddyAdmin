"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
    Activity,
    Cpu,
    Network,
    Server,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Settings,
    Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { getMetrics, getCaddyMetrics, type Metrics, type CaddyMetrics } from "@/lib/api";

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [caddyMetrics, setCaddyMetrics] = useState<CaddyMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [caddyError, setCaddyError] = useState<string | null>(null);

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadMetrics() {
        try {
            const [res, caddyRes] = await Promise.allSettled([
                getMetrics(),
                getCaddyMetrics(),
            ]);

            if (res.status === "fulfilled") {
                setMetrics(res.value);
            }

            if (caddyRes.status === "fulfilled") {
                setCaddyMetrics(caddyRes.value);
                setCaddyError(null);
            } else {
                setCaddyError("Caddy metrics unavailable");
            }
        } catch (error) {
            console.error("Failed to load metrics");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading metrics...</div>;
    }

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const formatTimestamp = (ts: number) => {
        if (!ts) return "Never";
        return new Date(ts * 1000).toLocaleString();
    };

    const formatDuration = (seconds: number) => {
        if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}µs`;
        if (seconds < 1) return `${(seconds * 1000).toFixed(2)}ms`;
        return `${seconds.toFixed(2)}s`;
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        let parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        parts.push(`${s}s`);

        return parts.join("") || "0s";
    };

    const adminPathData = caddyMetrics?.admin.requests_by_path ?
        Object.entries(caddyMetrics.admin.requests_by_path).map(([path, count]) => ({
            name: path,
            value: count,
        })) : [];

    return (
        <div className="space-y-10 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                    <p className="text-muted-foreground mt-1">Real-time Caddy performance monitoring</p>
                </div>
                <Button variant="outline" onClick={() => loadMetrics()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Error Message */}
            {caddyError && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="w-5 h-5" />
                            <div>
                                <p className="font-medium">Caddy metrics unavailable</p>
                                <p className="text-sm opacity-90">
                                    Ensure Caddy has the metrics handler enabled at /metrics
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Overview Section */}
            {caddyMetrics && (
                <section className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className={caddyMetrics.config.last_reload_success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Config Status</CardTitle>
                                {caddyMetrics.config.last_reload_success ?
                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                                    <XCircle className="h-4 w-4 text-red-500" />
                                }
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">
                                    {caddyMetrics.config.last_reload_success ? "Healthy" : "Error"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatTimestamp(caddyMetrics.config.last_reload_timestamp)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Caddy Uptime</CardTitle>
                                <Activity className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">
                                    {caddyMetrics.process.start_time_seconds ? formatUptime(Date.now() / 1000 - caddyMetrics.process.start_time_seconds) : "N/A"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Backend: {metrics?.uptime_human || "N/A"}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Admin Requests</CardTitle>
                                <Settings className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{caddyMetrics.admin.requests_total.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">{caddyMetrics.admin.errors_total} errors</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">HTTP Requests</CardTitle>
                                <Network className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{caddyMetrics.http.requests_total.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">{caddyMetrics.http.requests_in_flight} in flight</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* Network Section */}
            {caddyMetrics && (
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Network Traffic</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <Network className="w-5 h-5" />
                                    Network Received
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-5xl font-bold text-green-600 dark:text-green-400">
                                    {formatBytes(caddyMetrics.network.receive_bytes_total)}
                                </div>
                                <p className="text-muted-foreground mt-2">Total bytes received</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Network className="w-5 h-5" />
                                    Network Transmitted
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatBytes(caddyMetrics.network.transmit_bytes_total)}
                                </div>
                                <p className="text-muted-foreground mt-2">Total bytes transmitted</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* Process & System Section */}
            {caddyMetrics && (
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">System Resources</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Goroutines</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{caddyMetrics.process.goroutines}</div>
                                <p className="text-xs text-muted-foreground mt-1">Concurrent tasks</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Threads</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{caddyMetrics.process.threads}</div>
                                <p className="text-xs text-muted-foreground mt-1">OS threads</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">CPU Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{caddyMetrics.process.cpu_seconds_total.toFixed(2)}s</div>
                                <p className="text-xs text-muted-foreground mt-1">Total usage</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Memory Limit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatBytes(caddyMetrics.runtime.mem_limit_bytes)}</div>
                                <p className="text-xs text-muted-foreground mt-1 text-yellow-500">Soft limit</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>File Descriptors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Open: {caddyMetrics.process.open_fds.toLocaleString()}</span>
                                        <span>Max: {caddyMetrics.process.max_fds.toLocaleString()}</span>
                                    </div>
                                    <Progress
                                        value={(caddyMetrics.process.open_fds / caddyMetrics.process.max_fds) * 100}
                                        className="h-3"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {((caddyMetrics.process.open_fds / caddyMetrics.process.max_fds) * 100).toFixed(4)}% utilized
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Memory Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-3xl font-bold text-blue-500">
                                            {formatBytes(caddyMetrics.process.resident_mem_bytes)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Physical (RSS)</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-purple-500">
                                            {formatBytes(caddyMetrics.process.virtual_mem_bytes)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Virtual (VMS)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* GC Runtime Section */}
            {caddyMetrics && (
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Runtime & GC</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Go Version</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold truncate" title={caddyMetrics.runtime.go_version}>
                                    {caddyMetrics.runtime.go_version || metrics?.runtime.go_version}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="w-4 h-4" /> GOMAXPROCS</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {caddyMetrics.runtime.gomaxprocs}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> GC Cycles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{caddyMetrics.gc.duration_seconds_count.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* Admin Stats Section */}
            {caddyMetrics && adminPathData.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">API Statistics</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>Admin API Requests by Path</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={adminPathData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis type="number" fontSize={12} stroke="#888888" />
                                    <YAxis dataKey="name" type="category" width={120} fontSize={11} stroke="#888888" />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Upstream Health Section - Only if Upstreams exist */}
            {caddyMetrics && caddyMetrics.reverse_proxy.upstreams && caddyMetrics.reverse_proxy.upstreams.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Upstream Health</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {caddyMetrics.reverse_proxy.upstreams.map((u, i) => (
                            <Card key={i} className={u.healthy ? "border-green-500/30" : "border-red-500/30"}>
                                <CardContent className="pt-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {u.healthy ?
                                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> :
                                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                        }
                                        <code className="text-sm truncate" title={u.address}>{u.address}</code>
                                    </div>
                                    <Badge variant={u.healthy ? "default" : "destructive"} className="ml-2">
                                        {u.healthy ? "Healthy" : "Unhealthy"}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
