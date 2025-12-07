"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
    Plus,
    Layers,
    Trash2,
    Server,
    Heart,
    Scale,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import {
    getUpstreamGroups,
    createUpstreamGroup,
    deleteUpstreamGroup,
    getUpstreams,
    type UpstreamGroup,
    type Upstream,
} from "@/lib/api";

const LOAD_BALANCING_POLICIES = [
    { value: "round_robin", label: "Round Robin", description: "Distribute evenly in order" },
    { value: "least_conn", label: "Least Connections", description: "Route to server with fewest active connections" },
    { value: "first", label: "First Available", description: "Use first healthy upstream" },
    { value: "random", label: "Random", description: "Random selection" },
    { value: "ip_hash", label: "IP Hash", description: "Consistent routing based on client IP" },
    { value: "uri_hash", label: "URI Hash", description: "Consistent routing based on request URI" },
    { value: "header", label: "Header Hash", description: "Consistent routing based on header value" },
    { value: "cookie", label: "Cookie Hash", description: "Consistent routing based on cookie value" },
];

export default function UpstreamGroupsPage() {
    const [groups, setGroups] = useState<UpstreamGroup[]>([]);
    const [upstreams, setUpstreams] = useState<Upstream[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        load_balancing: "round_robin",
        try_duration: 5,
        try_interval: 250,
        health_checks: true,
        passive_health: true,
        retries: 3,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [groupsRes, upstreamsRes] = await Promise.all([
                getUpstreamGroups(),
                getUpstreams(),
            ]);
            setGroups(groupsRes.upstream_groups || []);
            setUpstreams(upstreamsRes.upstreams || []);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        try {
            await createUpstreamGroup(formData);
            toast.success("Upstream group created");
            setDialogOpen(false);
            setFormData({
                name: "",
                load_balancing: "round_robin",
                try_duration: 5,
                try_interval: 250,
                health_checks: true,
                passive_health: true,
                retries: 3,
            });
            loadData();
        } catch (error) {
            toast.error("Failed to create upstream group");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteUpstreamGroup(id);
            toast.success("Upstream group deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete upstream group");
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Upstream Groups
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure load balancing and failover for backend servers
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Create Upstream Group</DialogTitle>
                            <DialogDescription>
                                Configure load balancing for multiple backend servers
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., backend-servers"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Load Balancing Policy</Label>
                                <Select
                                    value={formData.load_balancing}
                                    onValueChange={(value) => setFormData({ ...formData, load_balancing: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LOAD_BALANCING_POLICIES.map((policy) => (
                                            <SelectItem key={policy.value} value={policy.value}>
                                                <div className="flex flex-col">
                                                    <span>{policy.label}</span>
                                                    <span className="text-xs text-muted-foreground">{policy.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="tryDuration">Try Duration (seconds)</Label>
                                    <Input
                                        id="tryDuration"
                                        type="number"
                                        min="0"
                                        value={formData.try_duration}
                                        onChange={(e) => setFormData({ ...formData, try_duration: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        How long to try other upstreams after failure
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="tryInterval">Try Interval (ms)</Label>
                                    <Input
                                        id="tryInterval"
                                        type="number"
                                        min="0"
                                        value={formData.try_interval}
                                        onChange={(e) => setFormData({ ...formData, try_interval: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Time between retry attempts
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="retries">Max Retries</Label>
                                <Input
                                    id="retries"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={formData.retries}
                                    onChange={(e) => setFormData({ ...formData, retries: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                    <div>
                                        <Label>Active Health Checks</Label>
                                        <p className="text-xs text-muted-foreground">Periodically check upstream health</p>
                                    </div>
                                    <Switch
                                        checked={formData.health_checks}
                                        onCheckedChange={(checked) => setFormData({ ...formData, health_checks: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                    <div>
                                        <Label>Passive Health</Label>
                                        <p className="text-xs text-muted-foreground">Detect failures from responses</p>
                                    </div>
                                    <Switch
                                        checked={formData.passive_health}
                                        onCheckedChange={(checked) => setFormData({ ...formData, passive_health: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!formData.name}>
                                Create Group
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-500" />
                            Total Groups
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{groups.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Server className="w-4 h-4 text-green-500" />
                            Available Upstreams
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{upstreams.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Heart className="w-4 h-4 text-purple-500" />
                            Healthy Upstreams
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{upstreams.filter(u => u.healthy).length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Groups Table */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Active Groups</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Upstream Groups</CardTitle>
                        <CardDescription>
                            Groups of backend servers with load balancing policies
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading...</div>
                        ) : groups.length === 0 ? (
                            <div className="p-12 text-center">
                                <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <h3 className="text-lg font-medium mb-2">No upstream groups yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Create groups to load balance between multiple backend servers
                                </p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Group
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Load Balancing</TableHead>
                                        <TableHead>Retries</TableHead>
                                        <TableHead>Health Checks</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                                                        <Layers className="w-4 h-4" />
                                                    </div>
                                                    {group.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                    <Scale className="w-3 h-3" />
                                                    {LOAD_BALANCING_POLICIES.find(p => p.value === group.load_balancing)?.label || group.load_balancing}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{group.retries} retries</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {group.health_checks && (
                                                        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {group.passive_health && (
                                                        <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                            Passive
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        setDeleteId(group.id);
                                                        setDeleteName(group.name);
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
                title={`Delete Upstream Group "${deleteName}"?`}
                description="This will permanently delete the group configuration."
                confirmText="Delete Group"
                variant="destructive"
            />
        </div>
    );
}
