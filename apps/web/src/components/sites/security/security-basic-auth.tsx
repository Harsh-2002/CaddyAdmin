"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, KeyRound, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    getBasicAuthUsers,
    createBasicAuthUser,
    deleteBasicAuthUser,
    type BasicAuthUser,
    type MiddlewareSettings,
    updateMiddlewareSettings,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface SecurityBasicAuthProps {
    siteId: string;
    middleware: MiddlewareSettings;
    onUpdateMiddleware: (settings: Partial<MiddlewareSettings>) => Promise<void>;
}

export function SecurityBasicAuth({ siteId, middleware, onUpdateMiddleware }: SecurityBasicAuthProps) {
    const [users, setUsers] = useState<BasicAuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newUser, setNewUser] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadUsers();
    }, [siteId]);

    async function loadUsers() {
        try {
            const data = await getBasicAuthUsers(siteId);
            setUsers(data.users || []);
        } catch (error) {
            toast.error("Failed to load basic auth users");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateUser() {
        if (!newUser.username || !newUser.password) {
            toast.error("Username and password are required");
            return;
        }

        try {
            await createBasicAuthUser(siteId, newUser);
            toast.success("User created successfully");
            setDialogOpen(false);
            setNewUser({ username: "", password: "" });
            loadUsers();
        } catch (error) {
            toast.error("Failed to create user");
        }
    }

    async function handleDeleteUser(userId: string) {
        try {
            await deleteBasicAuthUser(siteId, userId);
            toast.success("User deleted");
            loadUsers();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    }

    function generatePassword() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        const length = 16;
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewUser(prev => ({ ...prev, password }));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-0.5">
                    <Label className="text-base">Enable Basic Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                        Require username and password to access this site
                    </p>
                </div>
                <Switch
                    checked={middleware.basic_auth_enabled}
                    onCheckedChange={(checked) => onUpdateMiddleware({ basic_auth_enabled: checked })}
                />
            </div>

            {middleware.basic_auth_enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                            <KeyRound className="w-4 h-4" /> Users
                        </h4>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Basic Auth User</DialogTitle>
                                    <DialogDescription>
                                        Create a new user for basic authentication. Passwords are securely hashed.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input
                                            placeholder="e.g., admin"
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter or generate password"
                                                    value={newUser.password}
                                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                            <Button variant="outline" size="icon" onClick={generatePassword} title="Generate Password">
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Security Note</AlertTitle>
                                        <AlertDescription>
                                            Adding a user will require authentication for all routes on this site immediately.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateUser}>Create User</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Realm</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            No users defined. Access will be denied for everyone.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.realm || "Restricted"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                                                    Active
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteId(user.id)}
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
            )}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete User?"
                description="Are you sure you want to delete this user? Access will be revoked immediately."
                onConfirm={() => deleteId && handleDeleteUser(deleteId)}
                variant="destructive"
            />
        </div>
    );
}
