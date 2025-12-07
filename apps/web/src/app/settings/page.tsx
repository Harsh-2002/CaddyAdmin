"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
    Settings,
    RefreshCw,
    Save,
    Server,
    Mail,
    Shield,
    FileText,
    Globe,
    Activity,
    Database,
    CloudCog
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    syncConfig,
    getHealth,
    getGlobalSettings,
    updateGlobalSettings,
    type HealthStatus,
    type GlobalSettings,
} from "@/lib/api";

export default function SettingsPage() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        admin_email: "",
        default_acme_provider: "letsencrypt",
        log_level: "debug",
        access_log_enabled: true,
        grace_period: 10,
        http_port: 80,
        https_port: 443,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [healthRes, settingsRes] = await Promise.all([
                getHealth(),
                getGlobalSettings().catch(() => null),
            ]);
            setHealth(healthRes);
            if (settingsRes) {
                setSettings(settingsRes);
                setFormData({
                    admin_email: settingsRes.admin_email || "",
                    default_acme_provider: settingsRes.default_acme_provider || "letsencrypt",
                    log_level: (settingsRes.log_level || "debug").toLowerCase(),
                    access_log_enabled: settingsRes.access_log_enabled ?? true,
                    grace_period: settingsRes.grace_period || 10,
                    http_port: settingsRes.http_port || 80,
                    https_port: settingsRes.https_port || 443,
                });
            }
        } catch (error) {
            toast.error("Failed to load settings");
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

    async function handleSaveSettings() {
        setSaving(true);
        try {
            await updateGlobalSettings(formData);
            toast.success("Global settings saved");
            loadData();
        } catch (error) {
            toast.error("Failed to save global settings");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Configure global parameters and view system status</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync to Caddy"}
                    </Button>
                    <Button onClick={handleSaveSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </div>

            {/* Section: General */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">General Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Mail className="w-4 h-4 text-indigo-500" />
                                ACME Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="adminEmail">Admin Email</Label>
                                <Input
                                    id="adminEmail"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={formData.admin_email}
                                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                />
                                <p className="text-[13px] text-muted-foreground">
                                    Used for registration and recovery with the certificate authority.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Default Provider</Label>
                                <Select
                                    value={formData.default_acme_provider}
                                    onValueChange={(value) => setFormData({ ...formData, default_acme_provider: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="letsencrypt">Let's Encrypt</SelectItem>
                                        <SelectItem value="zerossl">ZeroSSL</SelectItem>
                                        <SelectItem value="buypass">Buypass</SelectItem>
                                        <SelectItem value="internal">Internal CA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Globe className="w-4 h-4 text-blue-500" />
                                Network & Ports
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="httpPort">HTTP Port</Label>
                                    <Input
                                        id="httpPort"
                                        type="number"
                                        value={formData.http_port}
                                        onChange={(e) => setFormData({ ...formData, http_port: parseInt(e.target.value) || 80 })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="httpsPort">HTTPS Port</Label>
                                    <Input
                                        id="httpsPort"
                                        type="number"
                                        value={formData.https_port}
                                        onChange={(e) => setFormData({ ...formData, https_port: parseInt(e.target.value) || 443 })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="gracePeriod">Grace Period (seconds)</Label>
                                <Input
                                    id="gracePeriod"
                                    type="number"
                                    value={formData.grace_period}
                                    onChange={(e) => setFormData({ ...formData, grace_period: parseInt(e.target.value) || 10 })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                Logging & Monitoring
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Log Level</Label>
                                <Select
                                    value={formData.log_level}
                                    onValueChange={(value) => setFormData({ ...formData, log_level: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="debug">Debug</SelectItem>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warn">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
                                <div>
                                    <Label className="text-base">Access Logs</Label>
                                    <p className="text-sm text-muted-foreground mt-0.5">Record all incoming HTTP requests</p>
                                </div>
                                <Switch
                                    checked={formData.access_log_enabled}
                                    onCheckedChange={(checked) => setFormData({ ...formData, access_log_enabled: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Section: Status */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">System Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-green-500/5 to-green-600/5 border-green-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="w-4 h-4 text-green-500" />
                                Backend Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {health ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">{health.status}</Badge>
                                    </div>
                                    <Separator className="bg-green-500/10" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-1">Version</span>
                                            <code className="text-sm font-semibold">{health.version}</code>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-1">Go Version</span>
                                            <code className="text-sm font-semibold">{health.go_version}</code>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground">Loading...</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield className="w-4 h-4 text-blue-500" />
                                Component Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {health ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Server className="w-4 h-4" /> Caddy Server</span>
                                        <Badge variant={health.components.caddy === "healthy" ? "secondary" : "destructive"} className={health.components.caddy === "healthy" ? "text-emerald-500 bg-emerald-500/10" : ""}>
                                            {health.components.caddy}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Database className="w-4 h-4" /> Database</span>
                                        <Badge variant={health.components.database === "healthy" ? "secondary" : "destructive"} className={health.components.database === "healthy" ? "text-blue-500 bg-blue-500/10" : ""}>
                                            {health.components.database}
                                        </Badge>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground">Loading...</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CloudCog className="w-4 h-4 text-purple-500" />
                            Connection Endpoints
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-sm font-medium">Frontend</span>
                                </div>
                                <code className="text-xs px-2 py-1 rounded bg-background border">:3000</code>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-sm font-medium">Backend API</span>
                                </div>
                                <code className="text-xs px-2 py-1 rounded bg-background border">:{formData.http_port}</code>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-sm font-medium">Admin API</span>
                                </div>
                                <code className="text-xs px-2 py-1 rounded bg-background border">:{2019}</code>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
