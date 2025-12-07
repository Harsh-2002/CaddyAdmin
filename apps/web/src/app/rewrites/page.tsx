"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, RefreshCw, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getSites, getRewriteRules, createRewriteRule, deleteRewriteRule, type Site, type RewriteRule } from "@/lib/api";

export default function RewritesPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [rewrites, setRewrites] = useState<Record<string, RewriteRule[]>>({});
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        site_id: "",
        match_type: "prefix",
        pattern: "",
        replacement: "",
        strip_prefix: "",
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const sitesRes = await getSites();
            setSites(sitesRes.sites || []);

            const rewritesMap: Record<string, RewriteRule[]> = {};
            for (const site of sitesRes.sites || []) {
                try {
                    const res = await getRewriteRules(site.id);
                    rewritesMap[site.id] = res.rules || [];
                } catch {
                    rewritesMap[site.id] = [];
                }
            }
            setRewrites(rewritesMap);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            await createRewriteRule(formData.site_id, {
                match_type: formData.match_type,
                pattern: formData.pattern,
                replacement: formData.replacement,
                strip_prefix: formData.strip_prefix,
                enabled: true,
            });
            toast.success("Rewrite created successfully");
            setDialogOpen(false);
            setFormData({ site_id: "", match_type: "prefix", pattern: "", replacement: "", strip_prefix: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to create rewrite");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteRewriteRule(id);
            toast.success("Rewrite deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete rewrite");
        }
    }

    const totalRewrites = Object.values(rewrites).flat().length;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rewrites</h1>
                    <p className="text-muted-foreground mt-1">Manage URL rewrite rules across all sites</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Rewrite
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Rewrite Rule</DialogTitle>
                            <DialogDescription>
                                Add a new URL rewrite rule to internally transform requests.
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
                                <Label>Match Type</Label>
                                <Select value={formData.match_type} onValueChange={(v) => setFormData({ ...formData, match_type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prefix">Prefix</SelectItem>
                                        <SelectItem value="exact">Exact</SelectItem>
                                        <SelectItem value="regexp">Regular Expression</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Pattern</Label>
                                <Input
                                    placeholder="/api/v1"
                                    value={formData.pattern}
                                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Replacement</Label>
                                <Input
                                    placeholder="/api/v2"
                                    value={formData.replacement}
                                    onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Strip Prefix (optional)</Label>
                                <Input
                                    placeholder="/api"
                                    value={formData.strip_prefix}
                                    onChange={(e) => setFormData({ ...formData, strip_prefix: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!formData.site_id || !formData.pattern}>
                                Create Rewrite
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            {!loading && totalRewrites > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-cyan-500 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Total Rewrites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalRewrites}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-violet-500 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Sites with Rewrites
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {Object.values(rewrites).filter(r => r.length > 0).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Rewrites Table */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">All Rewrites</h2>
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading rewrites...</div>
                        ) : totalRewrites === 0 ? (
                            <div className="p-16 text-center">
                                <RefreshCw className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                <h3 className="text-xl font-medium mb-2">No rewrites configured</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Create rewrite rules to internally transform request URLs.
                                </p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create First Rewrite
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Site</TableHead>
                                        <TableHead>Match Type</TableHead>
                                        <TableHead>Pattern</TableHead>
                                        <TableHead>Replacement</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.flatMap((site) =>
                                        (rewrites[site.id] || []).map((rewrite) => (
                                            <TableRow key={rewrite.id} className="group">
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{rewrite.match_type}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{rewrite.pattern}</TableCell>
                                                <TableCell className="font-mono text-sm">{rewrite.replacement || rewrite.strip_prefix}</TableCell>
                                                <TableCell>
                                                    <Badge variant={rewrite.enabled ? "default" : "outline"} className={rewrite.enabled ? "bg-emerald-600" : ""}>
                                                        {rewrite.enabled ? "Active" : "Disabled"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteId(rewrite.id)}
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
                title="Delete Rewrite Rule?"
                description="This action cannot be undone. This will permanently delete the rewrite rule."
                onConfirm={() => deleteId && handleDelete(deleteId)}
                variant="destructive"
            />
        </div>
    );
}
