"use client";

import * as React from "react";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Plus,
    Route as RouteIcon,
    Trash2,
    Settings2,
    Save,
    Globe,
    Shield,
    Lock,
    Server,
    KeyRound,
    FileText,
    Package,
    Info,
    Shuffle,
    Upload,
    Loader2,
    Folder,
    FileIcon,
} from "lucide-react";
import { RedirectsList } from "@/components/sites/redirects-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// Tabs removed
import { RewritesList } from "@/components/sites/rewrites-list";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
    getSite,
    updateSite,
    getRoutes,
    createRoute,
    deleteRoute,
    getTLSConfig,
    updateTLSConfig,
    getUpstreams,
    type Site,
    type Route,
    type TLSConfig,
    type Upstream,
    getMiddlewareSettings,
    updateMiddlewareSettings,
    type MiddlewareSettings,
    getCertificates,
    getDNSProviders,
    type CustomCertificate,
    type DNSProvider,
    getFiles,
    uploadFiles,
    deleteFile,
    type FileInfo,
} from "@/lib/api";
import { SecurityBasicAuth } from "./security/security-basic-auth";
import { SecurityAccessControl } from "./security/security-access-control";
import { SecurityHeaders } from "./security/security-headers";
import { SecurityMiddleware } from "./security/security-middleware";

export default function SiteDetailClient() {
    const params = useParams();
    const id = params?.id as string;
    const [site, setSite] = useState<Site | null>(null);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [upstreams, setUpstreams] = useState<Upstream[]>([]);
    const [tlsConfig, setTlsConfig] = useState<TLSConfig | null>(null);
    const [middlewareSettings, setMiddlewareSettings] = useState<MiddlewareSettings | null>(null);
    const [dnsProviders, setDnsProviders] = useState<DNSProvider[]>([]);
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [currentPath, setCurrentPath] = useState('/');
    const [sitePath, setSitePath] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingTls, setSavingTls] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Helper functions
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const loadFiles = async (path: string) => {
        try {
            const data = await getFiles(id, path);
            setFiles(data.files);
            setSitePath(data.site_path);
        } catch (err) {
            console.error('Failed to load files:', err);
        }
    };

    const handleUpload = async (fileList: FileList) => {
        setUploading(true);
        try {
            await uploadFiles(id, fileList, currentPath, true);
            await loadFiles(currentPath);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const [formData, setFormData] = useState({
        name: "",
        hosts: "",
        listen_port: 443,
        auto_https: true,
        enabled: true,
    });

    const [tlsForm, setTlsForm] = useState({
        auto_https: true,
        acme_email: "",
        acme_provider: "letsencrypt",
        on_demand_tls: false,
        wildcard_cert: false,
        dns_provider_id: "",
        custom_cert_path: "",
        custom_key_path: "",
        min_version: "tls1.2",
        cipher_suites: "",
    });

    const [routeForm, setRouteForm] = useState({
        name: "",
        path_matcher: "",
        handler_type: "reverse_proxy",
        methods: [] as string[],
        // Handler-specific fields
        upstream_address: "",
        upstream_group: "",
        file_root: "",
        file_browse: false,
        response_body: "",
        response_status: 200,
        redirect_url: "",
        redirect_permanent: false,
        order: 0,
        // Encode handler fields
        encode_gzip: true,
        encode_zstd: false,
        // Rewrite handler fields
        rewrite_uri: "",
        strip_path_prefix: "",
        // Headers handler fields
        header_name: "",
        header_value: "",
        header_delete: "",
        // Authentication handler fields
        auth_realm: "Restricted",
    });

    const [newRoute, setNewRoute] = useState({
        path_matcher: "/",
        match_type: "path_prefix",
        handler_type: "reverse_proxy",
        upstream_id: "",
        target_path: "",
        rewrite_strip_prefix: "",
    });

    // Certificates state
    const [customCerts, setCustomCerts] = useState<CustomCertificate[]>([]);
    const [certMode, setCertMode] = useState<"managed" | "manual">("managed");
    const [selectedCertId, setSelectedCertId] = useState<string>("");

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    async function loadData() {
        try {
            const [siteData, routesData, tlsData, upstreamsData, middlewareData, certsData, dnsData, filesData] = await Promise.all([
                getSite(id),
                getRoutes(id),
                getTLSConfig(id),
                getUpstreams(),
                getMiddlewareSettings(id),
                getCertificates(),
                getDNSProviders(),
                getFiles(id, "/").catch(() => ({ files: [], site_path: "" })),
            ]);

            setSite(siteData);
            setRoutes(routesData.routes || []);
            setTlsConfig(tlsData);
            setUpstreams(upstreamsData.upstreams || []);
            setMiddlewareSettings(middlewareData);
            setCustomCerts(certsData.certificates || []);
            setDnsProviders(dnsData.providers || []);
            setFiles(filesData.files || []);
            setSitePath(filesData.site_path || "");

            setFormData({
                name: siteData.name,
                hosts: (siteData.hosts || []).join(", "),
                listen_port: siteData.listen_port,
                auto_https: siteData.auto_https,
                enabled: siteData.enabled,
            });

            if (tlsData) {
                setTlsForm({
                    auto_https: tlsData.auto_https ?? siteData.auto_https,
                    acme_email: tlsData.acme_email || "",
                    acme_provider: tlsData.acme_provider || "letsencrypt",
                    on_demand_tls: tlsData.on_demand_tls ?? false,
                    wildcard_cert: tlsData.wildcard_cert ?? false,
                    dns_provider_id: tlsData.dns_provider_id || "",
                    custom_cert_path: tlsData.custom_cert_path || "",
                    custom_key_path: tlsData.custom_key_path || "",
                    min_version: tlsData.min_version || "tls1.2",
                    cipher_suites: tlsData.cipher_suites || "",
                });

                // Heuristic to detect if using a managed cert
                if (tlsData.custom_cert_path) {
                    setCertMode("manual");
                } else {
                    setCertMode("managed");
                    // Try to pre-select a matching certificate based on site hosts
                    const siteHosts = siteData.hosts || [];
                    const matchedCert = certsData.certificates?.find(c =>
                        c.domains.some(d => siteHosts.includes(d))
                    );
                    if (matchedCert) {
                        setSelectedCertId(matchedCert.id);
                    }
                }
            } else {
                // No TLSConfig record yet, use site's settings as defaults
                setTlsForm(prev => ({
                    ...prev,
                    auto_https: siteData.auto_https,
                }));
            }
        } catch (error) {
            toast.error("Failed to load site");
        } finally {
            setLoading(false);
        }
    }

    // Effect to update TLS config when managed cert changes
    useEffect(() => {
        if (certMode === "managed") {
            // When using managed mode, we clear the manual paths
            // The backend's load_pem module will handle certificate selection automatically based on SNI
            setTlsForm(prev => ({
                ...prev,
                custom_cert_path: "",
                custom_key_path: "",
            }));
        }
    }, [certMode, selectedCertId]);

    async function handleSave() {
        setSaving(true);
        try {
            const hosts = formData.hosts.split(",").map((h) => h.trim()).filter(Boolean);
            await updateSite(id, {
                name: formData.name,
                hosts,
                listen_port: formData.listen_port,
                auto_https: formData.auto_https,
                enabled: formData.enabled,
            });
            toast.success("Site updated");
            loadData();
        } catch (error) {
            toast.error("Failed to update site");
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveTls() {
        setSavingTls(true);
        try {
            await updateTLSConfig(id, tlsForm);
            toast.success("TLS settings updated");
            loadData();
        } catch (error) {
            toast.error("Failed to update TLS settings");
        } finally {
            setSavingTls(false);
        }
    }

    async function handleUpdateMiddleware(settings: Partial<MiddlewareSettings>) {
        try {
            const updated = await updateMiddlewareSettings(id, settings);
            setMiddlewareSettings(updated);
            toast.success("Settings updated");
        } catch (error) {
            toast.error("Failed to update settings");
        }
    }

    function buildHandlerConfig() {
        switch (routeForm.handler_type) {
            case "reverse_proxy":
                return JSON.stringify({ upstreams: [routeForm.upstream_address] });
            case "file_server":
                return JSON.stringify({ root: routeForm.file_root, browse: routeForm.file_browse });
            case "static_response":
                return JSON.stringify({ body: routeForm.response_body, status_code: routeForm.response_status });
            case "redirect":
                return JSON.stringify({ to: routeForm.redirect_url, permanent: routeForm.redirect_permanent });
            case "encode":
                return JSON.stringify({ gzip: routeForm.encode_gzip, zstd: routeForm.encode_zstd });
            case "rewrite":
                return JSON.stringify({ uri: routeForm.rewrite_uri, strip_path_prefix: routeForm.strip_path_prefix });
            case "headers":
                const headerConfig: { request?: object; response?: object } = {};
                if (routeForm.header_name && routeForm.header_value) {
                    headerConfig.response = { set: { [routeForm.header_name]: routeForm.header_value } };
                }
                if (routeForm.header_delete) {
                    headerConfig.response = { ...headerConfig.response, delete: [routeForm.header_delete] };
                }
                return JSON.stringify(headerConfig);
            case "authentication":
                return JSON.stringify({ realm: routeForm.auth_realm });
            default:
                return "{}";
        }
    }

    async function handleCreateRoute() {
        try {
            await createRoute(id, {
                name: routeForm.name,
                path_matcher: routeForm.path_matcher,
                handler_type: routeForm.handler_type,
                handler_config: buildHandlerConfig(),
                methods: routeForm.methods.length > 0 ? routeForm.methods : null,
                order: routeForm.order,
            });
            toast.success("Route created");
            setDialogOpen(false);
            setRouteForm({
                name: "", path_matcher: "", handler_type: "reverse_proxy", methods: [],
                upstream_address: "", upstream_group: "", file_root: "", file_browse: false,
                response_body: "", response_status: 200, redirect_url: "", redirect_permanent: false, order: 0,
                encode_gzip: true, encode_zstd: false, rewrite_uri: "", strip_path_prefix: "",
                header_name: "", header_value: "", header_delete: "",
                auth_realm: "Restricted",
            });
            loadData();
        } catch (error) {
            toast.error("Failed to create route");
        }
    }

    async function handleDeleteRoute(routeId: string, name: string) {
        setRouteToDelete({ id: routeId, name });
    }

    async function confirmDeleteRoute() {
        if (!routeToDelete) return;
        try {
            await deleteRoute(routeToDelete.id);
            toast.success("Route deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete route");
        } finally {
            setRouteToDelete(null);
        }
    }

    // State for route deletion
    const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);




    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    if (!site) {
        return <div className="p-8 text-center text-muted-foreground">Site not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Globe className="w-8 h-8 text-primary" />
                        {site.name}
                    </h1>
                    <p className="text-muted-foreground">{site.hosts?.join(", ")}</p>
                </div>
                <Badge variant={site.enabled ? "default" : "secondary"} className="text-sm">
                    {site.enabled ? "Active" : "Disabled"}
                </Badge>
                {site.tls_enabled && (
                    <Badge variant="outline" className="text-sm flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        HTTPS
                    </Badge>
                )}
            </div>

            {/* Sections */}
            <div className="space-y-10">

                {/* Settings Section */}
                <section id="settings" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Site Configuration</CardTitle>
                                <CardDescription>Basic site settings and domain configuration</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Site Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hosts">Hosts (comma-separated)</Label>
                                    <Input
                                        id="hosts"
                                        placeholder="example.com, www.example.com"
                                        value={formData.hosts}
                                        onChange={(e) => setFormData({ ...formData, hosts: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter domain names that this site should respond to
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="port">Listen Port</Label>
                                        <Input
                                            id="port"
                                            type="number"
                                            value={formData.listen_port}
                                            onChange={(e) => setFormData({ ...formData, listen_port: parseInt(e.target.value) || 443 })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                                        <div>
                                            <Label>Site Enabled</Label>
                                            <p className="text-sm text-muted-foreground">Serve traffic for this site</p>
                                        </div>
                                        <Switch
                                            checked={formData.enabled}
                                            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* SSL Section */}
                <section id="ssl" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-green-500" />
                                    SSL/TLS Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure HTTPS certificates and TLS settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Auto HTTPS */}
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-green-500/5 to-green-600/5 border-green-500/20">
                                    <div>
                                        <Label className="text-base">Automatic HTTPS</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Let Caddy automatically obtain and renew TLS certificates via ACME
                                        </p>
                                    </div>
                                    <Switch
                                        checked={tlsForm.auto_https}
                                        onCheckedChange={(checked) => setTlsForm({ ...tlsForm, auto_https: checked })}
                                    />
                                </div>

                                {tlsForm.auto_https && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4">
                                            <h4 className="font-medium">ACME Settings</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="acmeProvider">Certificate Provider</Label>
                                                    <Select
                                                        value={tlsForm.acme_provider}
                                                        onValueChange={(value) => setTlsForm({ ...tlsForm, acme_provider: value })}
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
                                                <div className="grid gap-2">
                                                    <Label htmlFor="acmeEmail">ACME Email</Label>
                                                    <Input
                                                        id="acmeEmail"
                                                        type="email"
                                                        placeholder="admin@example.com"
                                                        value={tlsForm.acme_email}
                                                        onChange={(e) => setTlsForm({ ...tlsForm, acme_email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                                    <div>
                                                        <Label>On-Demand TLS</Label>
                                                        <p className="text-xs text-muted-foreground">Obtain certs on first request</p>
                                                    </div>
                                                    <Switch
                                                        checked={tlsForm.on_demand_tls}
                                                        onCheckedChange={(checked) => setTlsForm({ ...tlsForm, on_demand_tls: checked })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                                    <div>
                                                        <Label>Wildcard Certificate</Label>
                                                        <p className="text-xs text-muted-foreground">Request *.domain.com cert</p>
                                                    </div>
                                                    <Switch
                                                        checked={tlsForm.wildcard_cert}
                                                        onCheckedChange={(checked) => setTlsForm({ ...tlsForm, wildcard_cert: checked })}
                                                    />
                                                </div>
                                                {tlsForm.wildcard_cert && (
                                                    <div className="space-y-2 pt-2 border-t mt-2">
                                                        <Label>DNS Provider (Required for Wildcard)</Label>
                                                        <Select
                                                            value={tlsForm.dns_provider_id}
                                                            onValueChange={(val) => setTlsForm({ ...tlsForm, dns_provider_id: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select DNS Provider" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {dnsProviders.map((p) => (
                                                                    <SelectItem key={p.id} value={p.id}>
                                                                        {p.name} ({p.provider})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            Configure providers in the main menu.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {!tlsForm.auto_https && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Custom Certificate</h4>
                                                <div className="flex bg-muted rounded-lg p-1">
                                                    <Button
                                                        variant={certMode === "managed" ? "default" : "ghost"}
                                                        size="sm"
                                                        onClick={() => setCertMode("managed")}
                                                        className="h-7"
                                                    >
                                                        Managed
                                                    </Button>
                                                    <Button
                                                        variant={certMode === "manual" ? "default" : "ghost"}
                                                        size="sm"
                                                        onClick={() => setCertMode("manual")}
                                                        className="h-7"
                                                    >
                                                        Manual Path
                                                    </Button>
                                                </div>
                                            </div>

                                            {certMode === "managed" ? (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="certSelect">Select Certificate</Label>
                                                        <Select
                                                            value={selectedCertId}
                                                            onValueChange={setSelectedCertId}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a certificate..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {customCerts.map((cert) => (
                                                                    <SelectItem key={cert.id} value={cert.id}>
                                                                        {cert.name} ({cert.domains?.join(", ")})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            Manage certificates in the SSL/TLS tab main menu.
                                                        </p>
                                                    </div>
                                                    {selectedCertId && (
                                                        <div className="grid gap-2 p-3 bg-muted/50 rounded-md border text-sm text-muted-foreground">
                                                            <div className="flex gap-2">
                                                                <span className="font-medium">Cert:</span>
                                                                <span className="break-all">{tlsForm.custom_cert_path}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="font-medium">Key:</span>
                                                                <span className="break-all">{tlsForm.custom_key_path}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="certPath">Certificate Path</Label>
                                                        <Input
                                                            id="certPath"
                                                            placeholder="/etc/ssl/certs/domain.crt"
                                                            value={tlsForm.custom_cert_path}
                                                            onChange={(e) => setTlsForm({ ...tlsForm, custom_cert_path: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="keyPath">Private Key Path</Label>
                                                        <Input
                                                            id="keyPath"
                                                            placeholder="/etc/ssl/private/domain.key"
                                                            value={tlsForm.custom_key_path}
                                                            onChange={(e) => setTlsForm({ ...tlsForm, custom_key_path: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <Separator />
                                <div className="space-y-4">
                                    <h4 className="font-medium">TLS Protocol Settings</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="minVersion">Minimum TLS Version</Label>
                                            <Select
                                                value={tlsForm.min_version}
                                                onValueChange={(value) => setTlsForm({ ...tlsForm, min_version: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="tls1.0">TLS 1.0 (Not Recommended)</SelectItem>
                                                    <SelectItem value="tls1.1">TLS 1.1 (Legacy)</SelectItem>
                                                    <SelectItem value="tls1.2">TLS 1.2 (Recommended)</SelectItem>
                                                    <SelectItem value="tls1.3">TLS 1.3 (Modern)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cipherSuites">Cipher Suites (optional)</Label>
                                            <Input
                                                id="cipherSuites"
                                                placeholder="Leave empty for defaults"
                                                value={tlsForm.cipher_suites}
                                                onChange={(e) => setTlsForm({ ...tlsForm, cipher_suites: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleSaveTls} disabled={savingTls}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {savingTls ? "Saving..." : "Save TLS Settings"}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* Security Section */}
                <section id="security" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-orange-500" />
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure authentication, access control, headers, and more
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Basic Authentication */}
                                <section>
                                    <h4 className="font-medium flex items-center gap-2 mb-4 text-lg">
                                        <KeyRound className="w-5 h-5" /> Basic Authentication
                                    </h4>
                                    {middlewareSettings && (
                                        <SecurityBasicAuth
                                            siteId={id}
                                            middleware={middlewareSettings}
                                            onUpdateMiddleware={handleUpdateMiddleware}
                                        />
                                    )}
                                </section>

                                <Separator />

                                {/* IP Access Control */}
                                <section>
                                    <h4 className="font-medium flex items-center gap-2 mb-4 text-lg">
                                        <Shield className="w-5 h-5" /> IP Access Control
                                    </h4>
                                    {middlewareSettings && (
                                        <SecurityAccessControl
                                            siteId={id}
                                            middleware={middlewareSettings}
                                            onUpdateMiddleware={handleUpdateMiddleware}
                                        />
                                    )}
                                </section>

                                <Separator />

                                {/* Custom Headers */}
                                <section>
                                    <h4 className="font-medium flex items-center gap-2 mb-4 text-lg">
                                        <FileText className="w-5 h-5" /> Custom Headers
                                    </h4>
                                    <SecurityHeaders siteId={id} />
                                </section>

                                <Separator />

                                {/* Compression */}
                                <section>
                                    <h4 className="font-medium flex items-center gap-2 mb-4 text-lg">
                                        <Package className="w-5 h-5" /> Compression
                                    </h4>
                                    {middlewareSettings && (
                                        <SecurityMiddleware
                                            middleware={middlewareSettings}
                                            onUpdateMiddleware={handleUpdateMiddleware}
                                        />
                                    )}
                                </section>
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* Redirects Section */}
                <section id="redirects" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <RedirectsList siteId={id} />
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* Rewrites Section */}
                <section id="rewrites" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <RewritesList siteId={id} />
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* Routes Section */}
                <section id="routes" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Routes</CardTitle>
                                    <CardDescription>Configure request routing and handlers</CardDescription>
                                </div>
                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Route
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>Create Route</DialogTitle>
                                            <DialogDescription>Configure a new route handler</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="routeName">Route Name</Label>
                                                    <Input
                                                        id="routeName"
                                                        placeholder="e.g., api-proxy"
                                                        value={routeForm.name}
                                                        onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="order">Priority Order</Label>
                                                    <Input
                                                        id="order"
                                                        type="number"
                                                        value={routeForm.order}
                                                        onChange={(e) => setRouteForm({ ...routeForm, order: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="pathMatcher">Path Matcher</Label>
                                                <Input
                                                    id="pathMatcher"
                                                    placeholder="e.g., /api/*, /static/*, /"
                                                    value={routeForm.path_matcher}
                                                    onChange={(e) => setRouteForm({ ...routeForm, path_matcher: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="handlerType">Handler Type</Label>
                                                <Select
                                                    value={routeForm.handler_type}
                                                    onValueChange={(value) => setRouteForm({ ...routeForm, handler_type: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="reverse_proxy">
                                                            <div className="flex items-center gap-2">
                                                                <Server className="w-4 h-4" />
                                                                Reverse Proxy
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="file_server">File Server</SelectItem>
                                                        <SelectItem value="static_response">Static Response</SelectItem>
                                                        <SelectItem value="redirect">Redirect</SelectItem>
                                                        <SelectItem value="encode">Compression (Encode)</SelectItem>
                                                        <SelectItem value="rewrite">URL Rewrite</SelectItem>
                                                        <SelectItem value="headers">Headers</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Separator />

                                            {/* Handler-specific fields */}
                                            {routeForm.handler_type === "reverse_proxy" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium flex items-center gap-2">
                                                        <Server className="w-4 h-4" />
                                                        Reverse Proxy Settings
                                                    </h4>
                                                    <div className="grid gap-2">
                                                        <Label>Upstream Address</Label>
                                                        <Input
                                                            placeholder="localhost:8080 or http://backend:3000"
                                                            value={routeForm.upstream_address}
                                                            onChange={(e) => setRouteForm({ ...routeForm, upstream_address: e.target.value })}
                                                        />
                                                    </div>
                                                    {upstreams.length > 0 && (
                                                        <div className="grid gap-2">
                                                            <Label>Or Select Upstream</Label>
                                                            <Select
                                                                value={routeForm.upstream_address}
                                                                onValueChange={(value) => setRouteForm({ ...routeForm, upstream_address: value })}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Choose existing upstream" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {upstreams.map((u) => (
                                                                        <SelectItem key={u.id} value={u.address}>
                                                                            {u.name} ({u.address})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {routeForm.handler_type === "file_server" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">File Server Settings</h4>
                                                    <div className="grid gap-2">
                                                        <Label>Root Directory</Label>
                                                        <Input
                                                            placeholder="/var/www/html"
                                                            value={routeForm.file_root}
                                                            onChange={(e) => setRouteForm({ ...routeForm, file_root: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Switch
                                                            checked={routeForm.file_browse}
                                                            onCheckedChange={(checked) => setRouteForm({ ...routeForm, file_browse: checked })}
                                                        />
                                                        <Label>Enable directory browsing</Label>
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "static_response" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">Static Response Settings</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label>Status Code</Label>
                                                            <Input
                                                                type="number"
                                                                value={routeForm.response_status}
                                                                onChange={(e) => setRouteForm({ ...routeForm, response_status: parseInt(e.target.value) || 200 })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>Response Body</Label>
                                                        <Input
                                                            placeholder="Hello World!"
                                                            value={routeForm.response_body}
                                                            onChange={(e) => setRouteForm({ ...routeForm, response_body: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "redirect" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">Redirect Settings</h4>
                                                    <div className="grid gap-2">
                                                        <Label>Redirect URL</Label>
                                                        <Input
                                                            placeholder="https://example.com/new-path"
                                                            value={routeForm.redirect_url}
                                                            onChange={(e) => setRouteForm({ ...routeForm, redirect_url: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Switch
                                                            checked={routeForm.redirect_permanent}
                                                            onCheckedChange={(checked) => setRouteForm({ ...routeForm, redirect_permanent: checked })}
                                                        />
                                                        <Label>Permanent redirect (301)</Label>
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "encode" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">Compression Settings</h4>
                                                    <p className="text-sm text-muted-foreground">Enable response compression (gzip, zstd)</p>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-4">
                                                            <Switch
                                                                checked={routeForm.encode_gzip !== false}
                                                                onCheckedChange={(checked) => setRouteForm({ ...routeForm, encode_gzip: checked })}
                                                            />
                                                            <Label>Enable Gzip</Label>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Switch
                                                                checked={routeForm.encode_zstd === true}
                                                                onCheckedChange={(checked) => setRouteForm({ ...routeForm, encode_zstd: checked })}
                                                            />
                                                            <Label>Enable Zstd</Label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "rewrite" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">URL Rewrite Settings</h4>
                                                    <div className="grid gap-2">
                                                        <Label>Rewrite URI</Label>
                                                        <Input
                                                            placeholder="/new-path{uri}"
                                                            value={routeForm.rewrite_uri}
                                                            onChange={(e) => setRouteForm({ ...routeForm, rewrite_uri: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>Strip Path Prefix</Label>
                                                        <Input
                                                            placeholder="/api"
                                                            value={routeForm.strip_path_prefix}
                                                            onChange={(e) => setRouteForm({ ...routeForm, strip_path_prefix: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "headers" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">Header Manipulation</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label>Header Name</Label>
                                                            <Input
                                                                placeholder="X-Custom-Header"
                                                                value={routeForm.header_name}
                                                                onChange={(e) => setRouteForm({ ...routeForm, header_name: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>Header Value</Label>
                                                            <Input
                                                                placeholder="my-value"
                                                                value={routeForm.header_value}
                                                                onChange={(e) => setRouteForm({ ...routeForm, header_value: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>Delete Response Header</Label>
                                                        <Input
                                                            placeholder="Server"
                                                            value={routeForm.header_delete}
                                                            onChange={(e) => setRouteForm({ ...routeForm, header_delete: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {routeForm.handler_type === "authentication" && (
                                                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                                    <h4 className="font-medium">Authentication Settings</h4>
                                                    <div className="grid gap-2">
                                                        <Label>Realm</Label>
                                                        <Input
                                                            placeholder="Restricted Area"
                                                            value={routeForm.auth_realm}
                                                            onChange={(e) => setRouteForm({ ...routeForm, auth_realm: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="p-3 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-md border border-yellow-200 dark:border-yellow-900">
                                                        Note: User accounts must be configured via the API or Caddyfile for this handler to work effectivey. This creates a basic auth challenge.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleCreateRoute} disabled={!routeForm.path_matcher}>
                                                Create Route
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="p-0">
                                {routes.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <RouteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                        <h3 className="text-lg font-medium mb-2">No routes yet</h3>
                                        <p className="text-muted-foreground mb-4">Add routes to handle requests</p>
                                        <Button onClick={() => setDialogOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Route
                                        </Button>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Path</TableHead>
                                                <TableHead>Handler</TableHead>
                                                <TableHead>Order</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {routes.map((route) => (
                                                <TableRow key={route.id}>
                                                    <TableCell className="font-medium">{route.name || "Unnamed"}</TableCell>
                                                    <TableCell>
                                                        <code className="text-sm bg-muted px-2 py-1 rounded">
                                                            {route.path_matcher}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{route.handler_type}</Badge>
                                                    </TableCell>
                                                    <TableCell>{route.order}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={route.enabled ? "default" : "secondary"}>
                                                            {route.enabled ? "Active" : "Disabled"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteRoute(route.id, route.name)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </section>

                {/* Files Section */}
                <section id="files" className="space-y-4 scroll-mt-20">
                    <section className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Static Files</span>
                                    <span className="text-sm font-normal text-muted-foreground">{sitePath}</span>
                                </CardTitle>
                                <CardDescription>
                                    Upload and manage static files for this site. Files are served via file_server routes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Breadcrumb navigation */}
                                <div className="flex items-center gap-2 text-sm">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setCurrentPath('/');
                                            loadFiles('/');
                                        }}
                                        disabled={currentPath === '/'}
                                    >
                                        Root
                                    </Button>
                                    {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, idx, arr) => {
                                        const path = '/' + arr.slice(0, idx + 1).join('/');
                                        return (
                                            <span key={path} className="flex items-center gap-2">
                                                <span>/</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setCurrentPath(path);
                                                        loadFiles(path);
                                                    }}
                                                >
                                                    {segment}
                                                </Button>
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Upload zone */}
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        const files = e.dataTransfer.files;
                                        if (files.length > 0) {
                                            await handleUpload(files);
                                        }
                                    }}
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        multiple
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                await handleUpload(e.target.files);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <span>Uploading...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-muted-foreground">Drop files here or click to upload</span>
                                            <span className="text-xs text-muted-foreground">Supports .zip, .tar, .tar.gz (auto-extracted)</span>
                                        </div>
                                    )}
                                </div>

                                {/* File list */}
                                {files.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No files uploaded yet
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Modified</TableHead>
                                                <TableHead className="w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {files.map((file) => (
                                                <TableRow key={file.path}>
                                                    <TableCell>
                                                        {file.type === 'directory' ? (
                                                            <button
                                                                className="flex items-center gap-2 text-primary hover:underline"
                                                                onClick={() => {
                                                                    setCurrentPath(file.path);
                                                                    loadFiles(file.path);
                                                                }}
                                                            >
                                                                <Folder className="h-4 w-4" />
                                                                {file.name}
                                                            </button>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <FileIcon className="h-4 w-4" />
                                                                {file.name}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {file.type === 'directory' ? '-' : formatBytes(file.size)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(file.modified).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                if (confirm(`Delete ${file.name}?`)) {
                                                                    try {
                                                                        await deleteFile(id, file.path);
                                                                        loadFiles(currentPath);
                                                                    } catch (err) {
                                                                        console.error('Delete failed:', err);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </section>
            </div >
            <ConfirmDialog
                open={!!routeToDelete}
                onOpenChange={(open) => !open && setRouteToDelete(null)}
                onConfirm={confirmDeleteRoute}
                title={`Delete Route "${routeToDelete?.name || ''}"?`}
                description="This action cannot be undone."
                confirmText="Delete Route"
                variant="destructive"
            />
        </div >
    );
}
