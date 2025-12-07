"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Server, Trash2, Network, Scale, Activity } from "lucide-react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getUpstreams, createUpstream, deleteUpstream, type Upstream } from "@/lib/api";

export default function UpstreamsPage() {
    const [upstreams, setUpstreams] = useState<Upstream[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        scheme: "http",
        weight: 1,
        health_check_path: "",
    });

    useEffect(() => {
        loadUpstreams();
    }, []);

    async function loadUpstreams() {
        try {
            const res = await getUpstreams();
            setUpstreams(res.upstreams || []);
        } catch (error) {
            toast.error("Failed to load upstreams");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            await createUpstream({
                name: formData.name,
                address: formData.address,
                scheme: formData.scheme,
                weight: formData.weight,
                health_check_path: formData.health_check_path,
            });
            toast.success("Upstream created");
            setDialogOpen(false);
            setFormData({ name: "", address: "", scheme: "http", weight: 1, health_check_path: "" });
            loadUpstreams();
        } catch (error) {
            toast.error("Failed to create upstream");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteUpstream(id);
            toast.success("Upstream deleted");
            loadUpstreams();
        } catch (error) {
            toast.error("Failed to delete upstream");
        }
    }

    // Stats
    const totalWeight = upstreams.reduce((acc, u) => acc + (u.weight || 1), 0);
    const healthChecksEnabled = upstreams.filter(u => u.health_check_path).length;

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upstreams</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage backend servers for load balancing
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Upstream
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Upstream</DialogTitle>
                            <DialogDescription>Add a backend server for load balancing</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., backend-1"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    placeholder="e.g., localhost:8080"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="scheme">Scheme</Label>
                                    <Select
                                        value={formData.scheme}
                                        onValueChange={(value) => setFormData({ ...formData, scheme: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="http">HTTP</SelectItem>
                                            <SelectItem value="https">HTTPS</SelectItem>
                                            <SelectItem value="h2c">H2C</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="weight">Weight</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        min="1"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="healthPath">Health Check Path (optional)</Label>
                                <Input
                                    id="healthPath"
                                    placeholder="e.g., /health"
                                    value={formData.health_check_path}
                                    onChange={(e) => setFormData({ ...formData, health_check_path: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!formData.name || !formData.address}>
                                Create Upstream
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overview Stats */}
            {!loading && upstreams.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-500 flex items-center gap-2">
                                <Server className="w-4 h-4" />
                                Total Upstreams
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{upstreams.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-500 flex items-center gap-2">
                                <Scale className="w-4 h-4" />
                                Total Weight
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalWeight}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-cyan-500 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Health Checked
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{healthChecksEnabled}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Active Targets</h2>
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading upstreams...</div>
                        ) : upstreams.length === 0 ? (
                            <div className="p-16 text-center">
                                <Server className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                <h3 className="text-xl font-medium mb-2">No upstreams defined</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Add backend servers for your reverse proxy to balance traffic.</p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Upstream
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Scheme</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Health Check</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upstreams.map((upstream) => (
                                        <TableRow key={upstream.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                                                        <Server className="w-4 h-4" />
                                                    </div>
                                                    {upstream.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{upstream.address}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">{upstream.scheme}</Badge>
                                            </TableCell>
                                            <TableCell>{upstream.weight}</TableCell>
                                            <TableCell>
                                                {upstream.health_check_path ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                                        <code className="text-xs">{upstream.health_check_path}</code>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs opacity-50">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setDeleteId(upstream.id);
                                                        setDeleteName(upstream.name);
                                                    }}
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

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={() => deleteId && handleDelete(deleteId)}
                title={`Delete Upstream "${deleteName}"?`}
                description="This will remove the backend server from the configuration. Wait for current connections to drain before deleting."
                confirmText="Delete Upstream"
                variant="destructive"
            />
        </div>
    );
}
