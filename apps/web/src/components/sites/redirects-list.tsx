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
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, ArrowRight, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { getRedirectRules, createRedirectRule, deleteRedirectRule, type RedirectRule } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function RedirectsList({ siteId }: { siteId: string }) {
    const [rules, setRules] = useState<RedirectRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

    const [form, setForm] = useState({
        source: "",
        destination: "",
        code: 301,
        priority: 0,
        enabled: true,
    });

    useEffect(() => {
        loadRules();
    }, [siteId]);

    async function loadRules() {
        try {
            const res = await getRedirectRules(siteId);
            setRules(res.rules || []);
        } catch (error) {
            toast.error("Failed to load redirect rules");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!form.source || !form.destination) {
            toast.error("Source and destination are required");
            return;
        }

        try {
            await createRedirectRule(siteId, form);
            toast.success("Redirect rule created");
            setDialogOpen(false);
            setForm({ source: "", destination: "", code: 301, priority: 0, enabled: true });
            loadRules();
        } catch (error) {
            toast.error("Failed to create redirect rule");
        }
    }

    async function handleDelete() {
        if (!ruleToDelete) return;
        try {
            await deleteRedirectRule(ruleToDelete);
            toast.success("Redirect rule deleted");
            loadRules();
        } catch (error) {
            toast.error("Failed to delete redirect rule");
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
                    <h3 className="text-lg font-medium">Redirect Rules</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage URL redirects (e.g., /old to /new)
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Redirect
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Redirect Rule</DialogTitle>
                            <DialogDescription>
                                Create a new HTTP redirect rule.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Source Path</Label>
                                <Input
                                    placeholder="/old-path"
                                    value={form.source}
                                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Destination URL</Label>
                                <Input
                                    placeholder="https://example.com/new-path"
                                    value={form.destination}
                                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Status Code</Label>
                                    <Select
                                        value={form.code.toString()}
                                        onValueChange={(v) => setForm({ ...form, code: parseInt(v) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="301">301 (Permanent)</SelectItem>
                                            <SelectItem value="302">302 (Found)</SelectItem>
                                            <SelectItem value="307">307 (Temporary)</SelectItem>
                                            <SelectItem value="308">308 (Permanent)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Priority</Label>
                                    <Input
                                        type="number"
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
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
                            <TableHead>Source</TableHead>
                            <TableHead></TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No redirect rules defined
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-mono text-sm">{rule.source}</TableCell>
                                    <TableCell>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-blue-500">{rule.destination}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${rule.code === 301 || rule.code === 308 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {rule.code}
                                        </span>
                                    </TableCell>
                                    <TableCell>{rule.priority}</TableCell>
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
                title="Delete Redirect Rule"
                description="Are you sure you want to delete this redirect rule? This action cannot be undone."
                onConfirm={handleDelete}
            />
        </div>
    );
}
