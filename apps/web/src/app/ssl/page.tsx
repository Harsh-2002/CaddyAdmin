"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
    Shield,
    Lock,
    KeyRound,
    Save,
    Info,
    FileText,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getGlobalSettings, updateGlobalSettings, type GlobalSettings } from "@/lib/api";
import { CertificateManager } from "@/components/ssl/certificate-manager";

export default function SSLPage() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const res = await getGlobalSettings();
            setSettings(res);
        } catch (error) {
            toast.error("Failed to load SSL settings");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        try {
            await updateGlobalSettings(settings);
            toast.success("SSL/TLS settings saved");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    if (loading || !settings) {
        return <div className="p-8 text-center text-muted-foreground">Loading SSL/TLS settings...</div>;
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SSL/TLS Settings</h1>
                    <p className="text-muted-foreground mt-1">Configure global certificate and security settings</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Info Banner */}
            <Card className="border-indigo-500/20 bg-indigo-500/5">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-500 mt-0.5">
                            <Info className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-foreground">Global vs Per-Site Settings</p>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                These settings apply as smart defaults for all new sites. Individual sites can override specific parameters in their own configuration tabs if needed.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section: Automation */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Certificate Automation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <KeyRound className="w-4 h-4 text-emerald-500" />
                                ACME Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="acmeEmail">ACME Email</Label>
                                <Input
                                    id="acmeEmail"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={settings.default_acme_email || ""}
                                    onChange={(e) => setSettings({ ...settings, default_acme_email: e.target.value })}
                                />
                                <p className="text-[13px] text-muted-foreground">
                                    Used for critical certificate notifications from providers
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="acmeProvider">Certificate Provider</Label>
                                <Select
                                    value={settings.default_acme_provider || "letsencrypt"}
                                    onValueChange={(value) => setSettings({ ...settings, default_acme_provider: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="letsencrypt">Let's Encrypt</SelectItem>
                                        <SelectItem value="zerossl">ZeroSSL</SelectItem>
                                        <SelectItem value="buypass">Buypass</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield className="w-4 h-4 text-blue-500" />
                                On-Demand TLS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                                <div>
                                    <Label className="text-base font-medium">Enable On-Demand</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Obtain certificates during the first TLS handshake
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.on_demand_tls_enabled || false}
                                    onCheckedChange={(checked) => setSettings({ ...settings, on_demand_tls_enabled: checked })}
                                />
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 mt-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-500">
                                    Only enable this if you need to serve thousands of domains without restarting.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Section: Security Policies */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Security Protocols</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TLS Versions */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Lock className="w-4 h-4 text-purple-500" />
                                Protocol Versions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="minTls">Minimum TLS Version</Label>
                                <Select
                                    value={settings.default_min_tls || "tls1.2"}
                                    onValueChange={(value) => setSettings({ ...settings, default_min_tls: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tls1.0">TLS 1.0 (Legacy)</SelectItem>
                                        <SelectItem value="tls1.1">TLS 1.1 (Legacy)</SelectItem>
                                        <SelectItem value="tls1.2">TLS 1.2 (Standard)</SelectItem>
                                        <SelectItem value="tls1.3">TLS 1.3 (Modern Only)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* HSTS */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield className="w-4 h-4 text-indigo-500" />
                                HTTP Strict Transport Security (HSTS)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable HSTS Policy</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Force browsers to always communicate over HTTPS
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.hsts_enabled || false}
                                    onCheckedChange={(checked) => setSettings({ ...settings, hsts_enabled: checked })}
                                />
                            </div>

                            {settings.hsts_enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="hstsMaxAge">Max Age (seconds)</Label>
                                        <Input
                                            id="hstsMaxAge"
                                            type="number"
                                            value={settings.hsts_max_age || 31536000}
                                            onChange={(e) => setSettings({ ...settings, hsts_max_age: parseInt(e.target.value) || 31536000 })}
                                        />
                                    </div>
                                    <div className="space-y-3 pt-1">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="includeSubdomains" className="cursor-pointer">Include Subdomains</Label>
                                            <Switch
                                                id="includeSubdomains"
                                                checked={settings.hsts_include_subs || false}
                                                onCheckedChange={(checked) => setSettings({ ...settings, hsts_include_subs: checked })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="preload" className="cursor-pointer">Preload List</Label>
                                            <Switch
                                                id="preload"
                                                checked={settings.hsts_preload || false}
                                                onCheckedChange={(checked) => setSettings({ ...settings, hsts_preload: checked })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Section: Custom Certs */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Custom Certificates</h2>
                {/* CertificateManager contains its own Card/UI, just need to integrate nicely */}
                <div className="p-1">
                    <CertificateManager />
                </div>
            </section>
        </div>
    );
}
