"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Globe, Settings, Trash2, ShieldCheck, Activity, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getSites, createSite, deleteSite, createRoute, getFiles, type Site } from "@/lib/api";

export default function SitesPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        hosts: "",
        listen_port: 443,
        auto_https: true,
        tls_enabled: true,
        serve_static: true,
    });

    useEffect(() => {
        loadSites();
    }, []);

    async function loadSites() {
        try {
            const res = await getSites();
            setSites(res.sites || []);
        } catch (error) {
            toast.error("Failed to load sites");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            const hosts = formData.hosts.split(",").map((h) => h.trim()).filter(Boolean);
            const newSite = await createSite({
                name: formData.name,
                hosts,
                listen_port: formData.listen_port,
                auto_https: formData.auto_https,
                tls_enabled: formData.tls_enabled,
                enabled: true,
            });

            if (formData.serve_static && newSite.id) {
                try {
                    // Get the site's public path (creates directory if missing)
                    const filesInfo = await getFiles(newSite.id, "/");

                    // Create file_server route
                    await createRoute(newSite.id, {
                        path_matcher: "/",
                        match_type: "path",
                        handler_type: "file_server",
                        handler_config: JSON.stringify({
                            root: filesInfo.site_path,
                            browse: true
                        }),
                        enabled: true
                    });
                } catch (err) {
                    console.error("Failed to create default route:", err);
                    toast.error("Site created, but failed to setup file server");
                }
            }

            toast.success("Site created successfully");
            setDialogOpen(false);
            setFormData({ name: "", hosts: "", listen_port: 443, auto_https: true, tls_enabled: true, serve_static: true });
            loadSites();
        } catch (error) {
            toast.error("Failed to create site");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteSite(id);
            toast.success("Site deleted");
            loadSites();
        } catch (error) {
            toast.error("Failed to delete site");
        }
    }

    // Stats calculation
    const activeSites = sites.filter(s => s.enabled).length;
    const httpsSites = sites.filter(s => s.auto_https).length;
    const totalHosts = sites.reduce((acc, s) => acc + (s.hosts?.length || 0), 0);

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
                    <p className="text-muted-foreground mt-1">Manage your domains and hosts</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Site
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create New Site</DialogTitle>
                            <DialogDescription>
                                Add a new domain configuration to your Caddy server.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Site Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., my-website"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="hosts">Hosts (comma-separated)</Label>
                                <Input
                                    id="hosts"
                                    placeholder="e.g., example.com, www.example.com"
                                    value={formData.hosts}
                                    onChange={(e) => setFormData({ ...formData, hosts: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="port">Listen Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    value={formData.listen_port}
                                    onChange={(e) => setFormData({ ...formData, listen_port: parseInt(e.target.value) || 443 })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Automatic HTTPS</Label>
                                    <p className="text-sm text-muted-foreground">Enable auto TLS certificates</p>
                                </div>
                                <Switch
                                    checked={formData.auto_https}
                                    onCheckedChange={(checked) => setFormData({ ...formData, auto_https: checked, tls_enabled: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Serve Static Files</Label>
                                    <p className="text-sm text-muted-foreground">Enable built-in file server</p>
                                </div>
                                <Switch
                                    checked={formData.serve_static}
                                    onCheckedChange={(checked) => setFormData({ ...formData, serve_static: checked })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!formData.name || !formData.hosts}>
                                Create Site
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overview Stats */}
            {!loading && sites.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-500 flex items-center gap-2">
                                <Server className="w-4 h-4" />
                                Total Sites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{sites.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Active
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeSites}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                HTTPS Enabled
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{httpsSites}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sites List */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Configured Domains</h2>
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading sites...</div>
                        ) : sites.length === 0 ? (
                            <div className="p-16 text-center">
                                <Globe className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                <h3 className="text-xl font-medium mb-2">No sites configured</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Get started by adding your first domain to be managed by Caddy.
                                </p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Site
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Hosts</TableHead>
                                        <TableHead>Port</TableHead>
                                        <TableHead>HTTPS</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.map((site) => (
                                        <TableRow key={site.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <Link href={`/sites/${site.id}`} className="hover:underline flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                                                        <Globe className="w-4 h-4" />
                                                    </div>
                                                    {site.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {site.hosts?.slice(0, 2).map((host) => (
                                                        <Badge key={host} variant="secondary" className="font-mono text-xs font-normal">
                                                            {host}
                                                        </Badge>
                                                    ))}
                                                    {site.hosts && site.hosts.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{site.hosts.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">{site.listen_port}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {site.auto_https ?
                                                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> :
                                                        <div className="w-4 h-4" />
                                                    }
                                                    <span className="text-sm">{site.auto_https ? "Auto" : "Manual"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={site.enabled ? "default" : "outline"} className={site.enabled ? "bg-emerald-600 hover:bg-emerald-600" : "text-muted-foreground"}>
                                                    {site.enabled ? "Active" : "Disabled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/sites/${site.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                            <Settings className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            setDeleteId(site.id);
                                                            setDeleteName(site.name);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={() => deleteId && handleDelete(deleteId)}
                title={`Delete Site "${deleteName}"?`}
                description="This action cannot be undone. This will permanently delete the site configuration and stop serving traffic for these domains."
                confirmText="Delete Site"
                variant="destructive"
            />
        </div>
    );
}
