"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, ArrowRight, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getSites, getRedirectRules, createRedirectRule, deleteRedirectRule, type Site, type RedirectRule } from "@/lib/api";

export default function RedirectsPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [redirects, setRedirects] = useState<Record<string, RedirectRule[]>>({});
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        site_id: "",
        source: "",
        destination: "",
        code: 301,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const sitesRes = await getSites();
            setSites(sitesRes.sites || []);

            // Load redirects for each site
            const redirectsMap: Record<string, RedirectRule[]> = {};
            for (const site of sitesRes.sites || []) {
                try {
                    const res = await getRedirectRules(site.id);
                    redirectsMap[site.id] = res.rules || [];
                } catch {
                    redirectsMap[site.id] = [];
                }
            }
            setRedirects(redirectsMap);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            await createRedirectRule(formData.site_id, {
                source: formData.source,
                destination: formData.destination,
                code: formData.code,
                enabled: true,
            });
            toast.success("Redirect created successfully");
            setDialogOpen(false);
            setFormData({ site_id: "", source: "", destination: "", code: 301 });
            loadData();
        } catch (error) {
            toast.error("Failed to create redirect");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteRedirectRule(id);
            toast.success("Redirect deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete redirect");
        }
    }

    const totalRedirects = Object.values(redirects).flat().length;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Redirects</h1>
                    <p className="text-muted-foreground mt-1">Manage URL redirections across all sites</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Redirect
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Redirect Rule</DialogTitle>
                            <DialogDescription>
                                Add a new URL redirect rule to a site.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Site</Label>
                                <Select value={formData.site_id} onValueChange={(v) => setFormData({ ...formData, site_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sites.map((site) => (
                                            <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Source Path</Label>
                                <Input
                                    placeholder="/old-path"
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Destination URL</Label>
                                <Input
                                    placeholder="https://example.com/new-path"
                                    value={formData.destination}
                                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Redirect Type</Label>
                                <Select value={formData.code.toString()} onValueChange={(v) => setFormData({ ...formData, code: parseInt(v) })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="301">301 - Permanent</SelectItem>
                                        <SelectItem value="302">302 - Temporary</SelectItem>
                                        <SelectItem value="307">307 - Temporary (Preserve Method)</SelectItem>
                                        <SelectItem value="308">308 - Permanent (Preserve Method)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!formData.site_id || !formData.source || !formData.destination}>
                                Create Redirect
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            {!loading && totalRedirects > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-pink-500 flex items-center gap-2">
                                <ArrowRight className="w-4 h-4" />
                                Total Redirects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalRedirects}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Sites with Redirects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {Object.values(redirects).filter(r => r.length > 0).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Redirects by Site */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">All Redirects</h2>
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading redirects...</div>
                        ) : totalRedirects === 0 ? (
                            <div className="p-16 text-center">
                                <ArrowRight className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                <h3 className="text-xl font-medium mb-2">No redirects configured</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Create redirect rules to forward traffic from one URL to another.
                                </p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Redirect
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Site</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.flatMap((site) =>
                                        (redirects[site.id] || []).map((redirect) => (
                                            <TableRow key={redirect.id} className="group">
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell className="font-mono text-sm">{redirect.source}</TableCell>
// ...
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteId(redirect.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Redirect Rule?"
                description="This action cannot be undone. This will permanently delete the redirect rule."
                onConfirm={() => deleteId && handleDelete(deleteId)}
                variant="destructive"
            />
        </div>
    );
}
