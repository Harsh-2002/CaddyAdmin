"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Shield, Users, Network, FileText, Trash2, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    getSites,
    getBasicAuthUsers, createBasicAuthUser, deleteBasicAuthUser,
    getAccessRules, createAccessRule, deleteAccessRule,
    getHeaderRules, createHeaderRule, deleteHeaderRule,
    type Site, type BasicAuthUser, type AccessRule, type HeaderRule
} from "@/lib/api";

export default function SecurityPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [authUsers, setAuthUsers] = useState<Record<string, BasicAuthUser[]>>({});
    const [accessRules, setAccessRules] = useState<Record<string, AccessRule[]>>({});
    const [headerRules, setHeaderRules] = useState<Record<string, HeaderRule[]>>({});
    const [loading, setLoading] = useState(true);

    // Dialogs
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [accessDialogOpen, setAccessDialogOpen] = useState(false);
    const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
    const [deleteState, setDeleteState] = useState<{ type: "auth" | "access" | "header"; id: string; siteId?: string } | null>(null);

    // Form data
    const [authForm, setAuthForm] = useState({ site_id: "", username: "", password: "" });
    const [accessForm, setAccessForm] = useState({ site_id: "", rule_type: "allow", cidr: "" });
    const [headerForm, setHeaderForm] = useState({ site_id: "", direction: "response", operation: "set", header_name: "", header_value: "" });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const sitesRes = await getSites();
            setSites(sitesRes.sites || []);

            const authMap: Record<string, BasicAuthUser[]> = {};
            const accessMap: Record<string, AccessRule[]> = {};
            const headerMap: Record<string, HeaderRule[]> = {};

            for (const site of sitesRes.sites || []) {
                try {
                    const [authRes, accessRes, headerRes] = await Promise.all([
                        getBasicAuthUsers(site.id),
                        getAccessRules(site.id),
                        getHeaderRules(site.id),
                    ]);
                    authMap[site.id] = authRes.users || [];
                    accessMap[site.id] = accessRes.rules || [];
                    headerMap[site.id] = headerRes.rules || [];
                } catch {
                    authMap[site.id] = [];
                    accessMap[site.id] = [];
                    headerMap[site.id] = [];
                }
            }

            setAuthUsers(authMap);
            setAccessRules(accessMap);
            setHeaderRules(headerMap);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    // Basic Auth handlers
    async function handleCreateAuth() {
        try {
            await createBasicAuthUser(authForm.site_id, { username: authForm.username, password: authForm.password });
            toast.success("User created");
            setAuthDialogOpen(false);
            setAuthForm({ site_id: "", username: "", password: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to create user");
        }
    }

    async function handleDeleteAuth(siteId: string, id: string) {
        try {
            await deleteBasicAuthUser(siteId, id);
            toast.success("User deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    }

    // Access Rule handlers
    async function handleCreateAccess() {
        try {
            await createAccessRule(accessForm.site_id, { rule_type: accessForm.rule_type, cidr: accessForm.cidr, enabled: true });
            toast.success("Access rule created");
            setAccessDialogOpen(false);
            setAccessForm({ site_id: "", rule_type: "allow", cidr: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to create access rule");
        }
    }

    async function handleDeleteAccess(id: string) {
        try {
            await deleteAccessRule(id);
            toast.success("Access rule deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete access rule");
        }
    }

    // Header Rule handlers
    async function handleCreateHeader() {
        try {
            await createHeaderRule(headerForm.site_id, {
                direction: headerForm.direction,
                operation: headerForm.operation,
                header_name: headerForm.header_name,
                header_value: headerForm.header_value,
                enabled: true,
            });
            toast.success("Header rule created");
            setHeaderDialogOpen(false);
            setHeaderForm({ site_id: "", direction: "response", operation: "set", header_name: "", header_value: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to create header rule");
        }
    }

    async function handleDeleteHeader(id: string) {
        try {
            await deleteHeaderRule(id);
            toast.success("Header rule deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete header rule");
        }
    }

    const totalAuth = Object.values(authUsers).flat().length;
    const totalAccess = Object.values(accessRules).flat().length;
    const totalHeaders = Object.values(headerRules).flat().length;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security</h1>
                    <p className="text-muted-foreground mt-1">Manage authentication, access control, and headers</p>
                </div>
            </div>

            {/* Stats */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-red-500 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Basic Auth Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalAuth}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                                <Network className="w-4 h-4" />
                                IP Access Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalAccess}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-violet-500 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Header Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalHeaders}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="auth" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="auth" className="gap-2"><Key className="w-4 h-4" /> Basic Auth</TabsTrigger>
                    <TabsTrigger value="access" className="gap-2"><Network className="w-4 h-4" /> IP Access</TabsTrigger>
                    <TabsTrigger value="headers" className="gap-2"><FileText className="w-4 h-4" /> Headers</TabsTrigger>
                </TabsList>

                {/* Basic Auth Tab */}
                <TabsContent value="auth" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Basic Auth Users</h2>
                        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Add User</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Basic Auth User</DialogTitle>
                                    <DialogDescription>Add a user for HTTP Basic Authentication.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Site</Label>
                                        <Select value={authForm.site_id} onValueChange={(v) => setAuthForm({ ...authForm, site_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                                            <SelectContent>
                                                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Username</Label>
                                        <Input value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Password</Label>
                                        <Input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateAuth} disabled={!authForm.site_id || !authForm.username || !authForm.password}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : totalAuth === 0 ? (
                                <div className="p-16 text-center">
                                    <Users className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                    <h3 className="text-xl font-medium mb-2">No users configured</h3>
                                    <p className="text-muted-foreground mb-6">Add Basic Auth users to protect your sites.</p>
                                    <Button onClick={() => setAuthDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add First User</Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Username</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {sites.flatMap((site) => (authUsers[site.id] || []).map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell className="font-mono">{user.username}</TableCell>
                                                <TableCell><Badge variant={user.enabled ? "default" : "outline"} className={user.enabled ? "bg-emerald-600" : ""}>{user.enabled ? "Active" : "Disabled"}</Badge></TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteState({ type: "auth", id: user.id, siteId: site.id })}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                            </TableRow>
                                        )))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* IP Access Tab */}
                <TabsContent value="access" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">IP Access Rules</h2>
                        <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Add Rule</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create IP Access Rule</DialogTitle>
                                    <DialogDescription>Allow or deny access based on IP address.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Site</Label>
                                        <Select value={accessForm.site_id} onValueChange={(v) => setAccessForm({ ...accessForm, site_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                                            <SelectContent>
                                                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Rule Type</Label>
                                        <Select value={accessForm.rule_type} onValueChange={(v) => setAccessForm({ ...accessForm, rule_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="allow">Allow</SelectItem>
                                                <SelectItem value="deny">Deny</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>CIDR</Label>
                                        <Input placeholder="192.168.1.0/24" value={accessForm.cidr} onChange={(e) => setAccessForm({ ...accessForm, cidr: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAccessDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateAccess} disabled={!accessForm.site_id || !accessForm.cidr}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : totalAccess === 0 ? (
                                <div className="p-16 text-center">
                                    <Network className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                    <h3 className="text-xl font-medium mb-2">No access rules configured</h3>
                                    <p className="text-muted-foreground mb-6">Add IP-based access control to your sites.</p>
                                    <Button onClick={() => setAccessDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add First Rule</Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Type</TableHead><TableHead>CIDR</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {sites.flatMap((site) => (accessRules[site.id] || []).map((rule) => (
                                            <TableRow key={rule.id}>
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell><Badge variant={rule.rule_type === "allow" ? "default" : "destructive"} className={rule.rule_type === "allow" ? "bg-emerald-600" : ""}>{rule.rule_type}</Badge></TableCell>
                                                <TableCell className="font-mono">{rule.cidr}</TableCell>
                                                <TableCell><Badge variant={rule.enabled ? "default" : "outline"}>{rule.enabled ? "Active" : "Disabled"}</Badge></TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteState({ type: "access", id: rule.id })}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                            </TableRow>
                                        )))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Headers Tab */}
                <TabsContent value="headers" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Header Rules</h2>
                        <Dialog open={headerDialogOpen} onOpenChange={setHeaderDialogOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Add Header</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Header Rule</DialogTitle>
                                    <DialogDescription>Add, remove, or modify headers.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Site</Label>
                                        <Select value={headerForm.site_id} onValueChange={(v) => setHeaderForm({ ...headerForm, site_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                                            <SelectContent>
                                                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Direction</Label>
                                            <Select value={headerForm.direction} onValueChange={(v) => setHeaderForm({ ...headerForm, direction: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="request">Request</SelectItem>
                                                    <SelectItem value="response">Response</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Operation</Label>
                                            <Select value={headerForm.operation} onValueChange={(v) => setHeaderForm({ ...headerForm, operation: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="set">Set</SelectItem>
                                                    <SelectItem value="add">Add</SelectItem>
                                                    <SelectItem value="delete">Delete</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Header Name</Label>
                                        <Input placeholder="X-Custom-Header" value={headerForm.header_name} onChange={(e) => setHeaderForm({ ...headerForm, header_name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Header Value</Label>
                                        <Input placeholder="value" value={headerForm.header_value} onChange={(e) => setHeaderForm({ ...headerForm, header_value: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setHeaderDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateHeader} disabled={!headerForm.site_id || !headerForm.header_name}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : totalHeaders === 0 ? (
                                <div className="p-16 text-center">
                                    <FileText className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                    <h3 className="text-xl font-medium mb-2">No header rules configured</h3>
                                    <p className="text-muted-foreground mb-6">Add header manipulation rules to your sites.</p>
                                    <Button onClick={() => setHeaderDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add First Header</Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Direction</TableHead><TableHead>Operation</TableHead><TableHead>Header</TableHead><TableHead>Value</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {sites.flatMap((site) => (headerRules[site.id] || []).map((rule) => (
                                            <TableRow key={rule.id}>
                                                <TableCell className="font-medium">{site.name}</TableCell>
                                                <TableCell><Badge variant="outline">{rule.direction}</Badge></TableCell>
                                                <TableCell><Badge variant="secondary">{rule.operation}</Badge></TableCell>
                                                <TableCell className="font-mono text-sm">{rule.header_name}</TableCell>
                                                <TableCell className="font-mono text-sm max-w-[150px] truncate">{rule.header_value}</TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteState({ type: "header", id: rule.id })}><Trash2 className="w-4 h-4" /></Button></TableCell>
                                            </TableRow>
                                        )))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={!!deleteState}
                onOpenChange={(open) => !open && setDeleteState(null)}
                title={
                    deleteState?.type === "auth" ? "Delete User?" :
                        deleteState?.type === "access" ? "Delete Access Rule?" :
                            "Delete Header Rule?"
                }
                description="This action cannot be undone."
                onConfirm={() => {
                    if (!deleteState) return;
                    if (deleteState.type === "auth" && deleteState.siteId) {
                        handleDeleteAuth(deleteState.siteId, deleteState.id);
                    } else if (deleteState.type === "access") {
                        handleDeleteAccess(deleteState.id);
                    } else if (deleteState.type === "header") {
                        handleDeleteHeader(deleteState.id);
                    }
                }}
                variant="destructive"
            />
        </div>
    );
}
