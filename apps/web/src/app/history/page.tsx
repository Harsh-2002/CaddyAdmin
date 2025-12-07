"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { History, RotateCcw, Plus, Trash2, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { getHistory, rollbackHistory, type ConfigHistory } from "@/lib/api";

export default function HistoryPage() {
    const [history, setHistory] = useState<ConfigHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [rollbackId, setRollbackId] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, [filter]);

    async function loadHistory() {
        try {
            const params: { limit: number; resource_type?: string } = { limit: 50 };
            if (filter !== "all") params.resource_type = filter;
            const res = await getHistory(params);
            setHistory(res.history || []);
        } catch (error) {
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
        }
    }

    async function handleRollback(id: string) {
        try {
            await rollbackHistory(id);
            toast.success("Rollback successful");
            loadHistory();
        } catch (error) {
            toast.error("Failed to rollback");
        }
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case "create": return <Plus className="w-4 h-4" />;
            case "delete": return <Trash2 className="w-4 h-4" />;
            case "update": return <Settings2 className="w-4 h-4" />;
            case "rollback": return <RotateCcw className="w-4 h-4" />;
            default: return <History className="w-4 h-4" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "create": return "bg-green-500/10 text-green-500";
            case "delete": return "bg-red-500/10 text-red-500";
            case "update": return "bg-blue-500/10 text-blue-500";
            case "rollback": return "bg-orange-500/10 text-orange-500";
            default: return "bg-muted text-muted-foreground";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">History</h1>
                    <p className="text-muted-foreground">Configuration change history with rollback</p>
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="site">Sites</SelectItem>
                        <SelectItem value="route">Routes</SelectItem>
                        <SelectItem value="upstream">Upstreams</SelectItem>
                        <SelectItem value="config">Config</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center">
                            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <h3 className="text-lg font-medium mb-2">No history yet</h3>
                            <p className="text-muted-foreground">Changes will appear here</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Resource</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium ${getActionColor(entry.action)}`}>
                                                {getActionIcon(entry.action)}
                                                <span className="capitalize">{entry.action}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize font-normal text-muted-foreground">
                                                {entry.resource_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm max-w-[200px] truncate" title={entry.resource_name || entry.resource_id}>
                                            {entry.resource_name || entry.resource_id?.slice(0, 8) || "-"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(entry.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={entry.success ? "default" : "destructive"}>
                                                {entry.success ? "Success" : "Failed"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {entry.previous_state && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setRollbackId(entry.id)}
                                                    className="h-8"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                    Rollback
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!rollbackId}
                onOpenChange={(open) => !open && setRollbackId(null)}
                onConfirm={() => rollbackId && handleRollback(rollbackId)}
                title="Rollback Configuration?"
                description="Are you sure you want to revert to this configuration state? This may affect currently running services."
                confirmText="Rollback"
            />
        </div>
    );
}
