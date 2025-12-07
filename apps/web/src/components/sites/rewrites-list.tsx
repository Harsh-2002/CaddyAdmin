"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getRewriteRules, createRewriteRule, deleteRewriteRule, type RewriteRule } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function RewritesList({ siteId }: { siteId: string }) {
    const [rules, setRules] = useState<RewriteRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

    const [form, setForm] = useState({
        match_type: "prefix",
        pattern: "",
        replacement: "",
        strip_prefix: "",
        enabled: true,
    });

    useEffect(() => {
        loadRules();
    }, [siteId]);

    async function loadRules() {
        try {
            const res = await getRewriteRules(siteId);
            setRules(res.rules || []);
        } catch (error) {
            toast.error("Failed to load rewrite rules");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!form.pattern) {
            toast.error("Pattern is required");
            return;
        }

        try {
            await createRewriteRule(siteId, form);
            toast.success("Rewrite rule created");
            setDialogOpen(false);
            setForm({ match_type: "prefix", pattern: "", replacement: "", strip_prefix: "", enabled: true });
            loadRules();
        } catch (error) {
            toast.error("Failed to create rewrite rule");
        }
    }

    async function handleDelete() {
        if (!ruleToDelete) return;
        try {
            await deleteRewriteRule(ruleToDelete);
            toast.success("Rewrite rule deleted");
            loadRules();
        } catch (error) {
            toast.error("Failed to delete rewrite rule");
        } finally {
            setRuleToDelete(null);
        }
    }

    if (loading) {
        return <div className="text-center p-4 text-muted-foreground">Loading rules...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Rewrite Rules</h3>
                    <p className="text-sm text-muted-foreground">
                        Rewrite URL components internally before processing (e.g., matching a path and stripping a prefix).
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Rewrite
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Rewrite Rule</DialogTitle>
                            <DialogDescription>
                                Transform requests internally.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Match Type</Label>
                                <Select
                                    value={form.match_type}
                                    onValueChange={(v) => setForm({ ...form, match_type: v })}
                                >
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
                                    value={form.pattern}
                                    onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Replacement (optional)</Label>
                                <Input
                                    placeholder="/api/v2"
                                    value={form.replacement}
                                    onChange={(e) => setForm({ ...form, replacement: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Strip Prefix (optional)</Label>
                                <Input
                                    placeholder="/api"
                                    value={form.strip_prefix}
                                    onChange={(e) => setForm({ ...form, strip_prefix: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Create Rule</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Match Type</TableHead>
                            <TableHead>Pattern</TableHead>
                            <TableHead>Replacement / Strip</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No rewrite rules defined
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        <Badge variant="outline">{rule.match_type}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{rule.pattern}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {rule.replacement || rule.strip_prefix ? (
                                            <div className="flex flex-col gap-1">
                                                {rule.replacement && <span>Replace: {rule.replacement}</span>}
                                                {rule.strip_prefix && <span>Strip: {rule.strip_prefix}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={rule.enabled ? "default" : "secondary"} className={rule.enabled ? "bg-emerald-600" : ""}>
                                            {rule.enabled ? "Active" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setRuleToDelete(rule.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConfirmDialog
                open={!!ruleToDelete}
                onOpenChange={(open) => !open && setRuleToDelete(null)}
                title="Delete Rewrite Rule"
                description="Are you sure you want to delete this rewrite rule? This action cannot be undone."
                onConfirm={handleDelete}
                variant="destructive"
            />
        </div>
    );
}
