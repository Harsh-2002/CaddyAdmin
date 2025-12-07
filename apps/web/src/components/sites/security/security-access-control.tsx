"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    getAccessRules,
    createAccessRule,
    deleteAccessRule,
    type AccessRule,
    type MiddlewareSettings,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface SecurityAccessControlProps {
    siteId: string;
    middleware: MiddlewareSettings;
    onUpdateMiddleware: (settings: Partial<MiddlewareSettings>) => Promise<void>;
}

export function SecurityAccessControl({ siteId, middleware, onUpdateMiddleware }: SecurityAccessControlProps) {
    const [rules, setRules] = useState<AccessRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newRule, setNewRule] = useState({ cidr: "", rule_type: "allow" });

    useEffect(() => {
        loadRules();
    }, [siteId]);

    async function loadRules() {
        try {
            const data = await getAccessRules(siteId);
            setRules(data.rules || []);
        } catch (error) {
            toast.error("Failed to load access rules");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateRule() {
        if (!newRule.cidr) {
            toast.error("CIDR / IP Address is required");
            return;
        }

        try {
            await createAccessRule(siteId, {
                cidr: newRule.cidr,
                rule_type: newRule.rule_type,
                priority: rules.length + 1,
            });
            toast.success("Access rule created");
            setDialogOpen(false);
            setNewRule({ cidr: "", rule_type: "allow" });
            loadRules();
        } catch (error) {
            toast.error("Failed to create access rule");
        }
    }

    async function handleDeleteRule(ruleId: string) {
        try {
            await deleteAccessRule(ruleId);
            toast.success("Access rule deleted");
            loadRules();
        } catch (error) {
            toast.error("Failed to delete access rule");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-0.5">
                    <Label className="text-base">IP Access Control</Label>
                    <p className="text-sm text-muted-foreground">
                        Filter traffic based on client IP addresses (CIDR format support)
                    </p>
                </div>
                <Switch
                    checked={middleware.access_control_enabled}
                    onCheckedChange={(checked) => onUpdateMiddleware({ access_control_enabled: checked })}
                />
            </div>

            {middleware.access_control_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                            <Network className="w-4 h-4" /> Access Rules
                        </h4>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Rule
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Access Rule</DialogTitle>
                                    <DialogDescription>
                                        Allow or deny traffic from specific IP ranges.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Action</Label>
                                        <Select
                                            value={newRule.rule_type}
                                            onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="allow">Allow</SelectItem>
                                                <SelectItem value="deny">Deny</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IP Range (CIDR)</Label>
                                        <Input
                                            placeholder="e.g., 192.168.1.0/24 or 10.0.0.5"
                                            value={newRule.cidr}
                                            onChange={(e) => setNewRule({ ...newRule, cidr: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Supports single IPs or CIDR ranges.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateRule}>Add Rule</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                    <TableHead>CIDR / IP Range</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                            No access rules defined. Default policy applies (Allow All).
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <Badge
                                                    variant={rule.rule_type === "allow" ? "default" : "destructive"}
                                                    className={rule.rule_type === "allow" ? "bg-green-500 hover:bg-green-600" : ""}
                                                >
                                                    {rule.rule_type.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">{rule.cidr}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteId(rule.id)}
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

                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span>Rules are evaluated in order. First match wins.</span>
                    </div>
                </div>
            )}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Access Rule?"
                description="This action cannot be undone."
                onConfirm={() => deleteId && handleDeleteRule(deleteId)}
                variant="destructive"
            />
        </div>
    );
}
