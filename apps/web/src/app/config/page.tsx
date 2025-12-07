
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
    RefreshCw,
    Globe,
    Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    getConfig,
    getSites,
    syncConfig,
    type Site,
} from "@/lib/api";
import { CodeEditor } from "@/components/ui/code-editor";

export default function ConfigPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>("global");

    // Config States
    const [jsonConfig, setJsonConfig] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [configRes, sitesRes] = await Promise.all([
                getConfig(),
                getSites(),
            ]);
            setJsonConfig(JSON.stringify(configRes, null, 2));
            setSites(sitesRes.sites || []);
        } catch (error) {
            toast.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    }

    async function handleSync() {
        setSyncing(true);
        try {
            await syncConfig();
            toast.success("Configuration synced to Caddy");
            loadData();
        } catch (error) {
            toast.error("Failed to sync configuration");
        } finally {
            setSyncing(false);
        }
    }

    async function handleValidate() {
        setValidating(true);
        try {
            // Basic JSON syntax check
            JSON.parse(jsonConfig);
            toast.success("JSON syntax is valid");
        } catch (error) {
            toast.error("Validation failed: Invalid JSON syntax");
        } finally {
            setValidating(false);
        }
    }

    // Filter helper
    function getDisplayJson() {
        if (selectedSiteId === "global") return jsonConfig;

        try {
            const config = JSON.parse(jsonConfig);
            const site = sites.find(s => s.id === selectedSiteId);
            if (!site) return jsonConfig;

            const apps = config.apps as Record<string, unknown> | undefined;
            const http = apps?.http as Record<string, unknown> | undefined;
            const servers = http?.servers as Record<string, unknown> | undefined;

            if (servers) {
                for (const [serverName, serverConfig] of Object.entries(servers)) {
                    const server = serverConfig as Record<string, unknown>;
                    const routes = server.routes as Array<Record<string, unknown>> | undefined;
                    if (routes) {
                        const siteRoutes = routes.filter((route) => {
                            const match = route.match as Array<Record<string, unknown>> | undefined;
                            if (match) {
                                return match.some((m) => {
                                    const hosts = m.host as string[] | undefined;
                                    return hosts?.some(h => site.hosts?.includes(h));
                                });
                            }
                            return false;
                        });
                        if (siteRoutes.length > 0) {
                            return JSON.stringify({
                                site: site.name,
                                hosts: site.hosts,
                                routes: siteRoutes,
                            }, null, 2);
                        }
                    }
                }
            }
            return JSON.stringify({ message: "No specific config found for this site" }, null, 2);

        } catch (e) {
            return "Invalid JSON in editor - cannot filter view.";
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading configuration...</div>;
    }

    const isGlobal = selectedSiteId === "global";
    const displayValue = isGlobal ? jsonConfig : getDisplayJson();

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-6 p-6">
            {/* Page Header */}
            <div className="flex-none flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
                    <p className="text-muted-foreground mt-1">View and manage Caddy server configuration</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleValidate} disabled={validating}>
                        <Check className={`w-4 h-4 mr-2 ${validating ? "animate-pulse" : ""}`} />
                        {validating ? "Validating..." : "Validate"}
                    </Button>

                    {isGlobal && (
                        /* Only show Sync (Apply) when editing global config */
                        <Button variant="outline" onClick={handleSync} disabled={syncing}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Syncing..." : "Sync to Caddy"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <section className="flex-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select site..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">
                                    <span className="font-medium">Global Configuration</span>
                                </SelectItem>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={site.id}>
                                        {site.name} ({site.hosts?.join(", ")})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* View Mode Toggle Removed */}
                </div>
            </section>

            {/* Configuration Display */}
            <section className="flex-1 min-h-0 flex flex-col">
                <Card className="flex-1 border-0 shadow-none bg-transparent">
                    {displayValue ? (
                        <CodeEditor
                            value={displayValue}
                            onChange={setJsonConfig}
                            language="json"
                            readOnly={!isGlobal} // Read only if filtering by site
                            className="h-full shadow-xl"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground border rounded-lg border-dashed">
                            No configuration loaded. Check server connection.
                        </div>
                    )}
                </Card>
            </section>
        </div>
    );
}

