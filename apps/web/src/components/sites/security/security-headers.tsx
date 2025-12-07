"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, ArrowRightLeft } from "lucide-react";
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
    getHeaderRules,
    createHeaderRule,
    deleteHeaderRule,
    type HeaderRule,
} from "@/lib/api";

interface SecurityHeadersProps {
    siteId: string;
}

export function SecurityHeaders({ siteId }: SecurityHeadersProps) {
    const [rules, setRules] = useState<HeaderRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newRule, setNewRule] = useState({
        direction: "response",
        operation: "set",
        header_name: "",
        header_value: "",
    });

    useEffect(() => {
        loadRules();
    }, [siteId]);

    async function loadRules() {
        try {
            const data = await getHeaderRules(siteId);
            setRules(data.rules || []);
        } catch (error) {
            toast.error("Failed to load header rules");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateRule() {
        if (!newRule.header_name) {
            toast.error("Header name is required");
            return;
        }

        try {
            await createHeaderRule(siteId, {
                direction: newRule.direction,
                operation: newRule.operation,
                header_name: newRule.header_name,
                header_value: newRule.header_value,
                priority: rules.length + 1,
            });
            toast.success("Header rule created");
            setDialogOpen(false);
            setNewRule({
                direction: "response",
                operation: "set",
                header_name: "",
                header_value: "",
            });
            loadRules();
        } catch (error) {
            toast.error("Failed to create header rule");
        }
    }

    async function handleDeleteRule(ruleId: string) {
        try {
            await deleteHeaderRule(ruleId);
            toast.success("Header rule deleted");
            loadRules();
        } catch (error) {
            toast.error("Failed to delete header rule");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Custom Headers
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Modify HTTP headers for requests and responses
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Header Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Header Rule</DialogTitle>
                            <DialogDescription>
                                Set, add, or delete headers from requests or responses.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Direction</Label>
                                    <Select
                                        value={newRule.direction}
                                        onValueChange={(value) => setNewRule({ ...newRule, direction: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="response">Response (Downstream)</SelectItem>
                                            <SelectItem value="request">Request (Upstream)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Operation</Label>
                                    <Select
                                        value={newRule.operation}
                                        onValueChange={(value) => setNewRule({ ...newRule, operation: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="set">Set (Overwrite)</SelectItem>
                                            <SelectItem value="add">Add (Append)</SelectItem>
                                            <SelectItem value="delete">Delete</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Header Name</Label>
                                <Input
                                    placeholder="e.g., X-Frame-Options"
                                    value={newRule.header_name}
                                    onChange={(e) => setNewRule({ ...newRule, header_name: e.target.value })}
                                />
                            </div>
                            {newRule.operation !== "delete" && (
                                <div className="space-y-2">
                                    <Label>Header Value</Label>
                                    <Input
                                        placeholder="e.g., DENY"
                                        value={newRule.header_value}
                                        onChange={(e) => setNewRule({ ...newRule, header_value: e.target.value })}
                                    />
                                </div>
                            )}
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
                            <TableHead>Type</TableHead>
                            <TableHead>Operation</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No header rules defined.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={rule.direction === "response" ? "border-blue-500 text-blue-500" : "border-orange-500 text-orange-500"}
                                        >
                                            {rule.direction === "response" ? "RESP" : "REQ"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{rule.operation}</TableCell>
                                    <TableCell className="font-mono text-sm">{rule.header_name}</TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                        {rule.operation === "delete" ? "—" : rule.header_value}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteRule(rule.id)}
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
        </div>
    );
}
