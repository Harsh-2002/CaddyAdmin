"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Cloud, Trash2, Star, CheckCircle, XCircle, Settings, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    getDNSProviderTypes,
    getDNSProviders,
    createDNSProvider,
    updateDNSProvider,
    deleteDNSProvider,
    type DNSProviderType,
    type DNSProvider,
} from "@/lib/api";

export default function DNSProvidersPage() {
    const [providerTypes, setProviderTypes] = useState<DNSProviderType[]>([]);
    const [providers, setProviders] = useState<DNSProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [selectedType, setSelectedType] = useState<DNSProviderType | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        provider: string;
        credentials: Record<string, string>;
        is_default: boolean;
    }>({
        name: "",
        provider: "",
        credentials: {},
        is_default: false,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [typesRes, providersRes] = await Promise.all([
                getDNSProviderTypes(),
                getDNSProviders(),
            ]);
            setProviderTypes(typesRes.types || []);
            setProviders(providersRes.providers || []);
        } catch (error) {
            toast.error("Failed to load DNS providers");
        } finally {
            setLoading(false);
        }
    }

    function handleProviderSelect(providerId: string) {
        const type = providerTypes.find(t => t.id === providerId);
        setSelectedType(type || null);
        setFormData({
            ...formData,
            provider: providerId,
            credentials: {},
        });
    }

    function handleCredentialChange(field: string, value: string) {
        setFormData({
            ...formData,
            credentials: {
                ...formData.credentials,
                [field]: value,
            },
        });
    }

    async function handleCreate() {
        try {
            await createDNSProvider(formData);
            toast.success("DNS provider created successfully");
            setDialogOpen(false);
            setFormData({ name: "", provider: "", credentials: {}, is_default: false });
            setSelectedType(null);
            loadData();
        } catch (error) {
            toast.error("Failed to create DNS provider");
        }
    }

    async function handleSetDefault(id: string) {
        try {
            await updateDNSProvider(id, { is_default: true });
            toast.success("Default provider updated");
            loadData();
        } catch (error) {
            toast.error("Failed to update provider");
        }
    }

    async function handleToggleEnabled(id: string, enabled: boolean) {
        try {
            await updateDNSProvider(id, { enabled });
            toast.success(enabled ? "Provider enabled" : "Provider disabled");
            loadData();
        } catch (error) {
            toast.error("Failed to update provider");
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteDNSProvider(id);
            toast.success("DNS provider deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete DNS provider");
        }
    }

    const isFormValid = formData.name && formData.provider && selectedType?.fields.every(f => !f.required || formData.credentials[f.name]);

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">DNS Providers</h1>
                    <p className="text-muted-foreground mt-1">Configure DNS challenge providers for wildcard certificates</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Provider
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                            <DialogTitle>Add DNS Provider</DialogTitle>
                            <DialogDescription>
                                Configure a DNS provider for ACME DNS-01 challenges. This enables wildcard certificates.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid gap-2">
                                <Label>Provider</Label>
                                <Select value={formData.provider} onValueChange={handleProviderSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a DNS provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providerTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedType && (
                                <>
                                    <div className="grid gap-2">
                                        <Label>Display Name</Label>
                                        <Input
                                            placeholder={`My ${selectedType.name}`}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="border-t pt-4 mt-2">
                                        <h4 className="font-medium mb-3">Credentials</h4>
                                        <div className="grid gap-4">
                                            {selectedType.fields.map((field) => (
                                                <div key={field.name} className="grid gap-2">
                                                    <Label>
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </Label>
                                                    <Input
                                                        type={field.type}
                                                        placeholder={field.placeholder}
                                                        value={formData.credentials[field.name] || ""}
                                                        onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div>
                                            <Label>Set as Default</Label>
                                            <p className="text-sm text-muted-foreground">Use this provider for all DNS challenges</p>
                                        </div>
                                        <Switch
                                            checked={formData.is_default}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                                        />
                                    </div>

                                    <Alert className="bg-blue-500/10 border-blue-500/20">
                                        <Cloud className="w-4 h-4 text-blue-500" />
                                        <AlertDescription className="text-sm">
                                            <strong>Module:</strong> <code className="text-xs bg-muted px-1 rounded">{selectedType.module}</code>
                                            <br />
                                            <span className="text-muted-foreground">
                                                Caddy must be compiled with this module for this provider to work.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!isFormValid}>Add Provider</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Info Banner */}
            <Alert className="bg-amber-500/10 border-amber-500/20">
                <Cloud className="w-4 h-4 text-amber-500" />
                <AlertDescription>
                    <strong>Important:</strong> DNS providers require Caddy to be compiled with the corresponding module using{" "}
                    <code className="text-xs bg-muted px-1 rounded">xcaddy</code>.{" "}
                    <a href="https://github.com/caddy-dns" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">
                        View all providers <ExternalLink className="w-3 h-3" />
                    </a>
                </AlertDescription>
            </Alert>

            {/* Stats */}
            {!loading && providers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-500 flex items-center gap-2">
                                <Cloud className="w-4 h-4" />
                                Total Providers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{providers.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Active
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{providers.filter(p => p.enabled).length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Default
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold truncate">
                                {providers.find(p => p.is_default)?.name || "Not set"}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Providers List */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Configured Providers</h2>
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading providers...</div>
                        ) : providers.length === 0 ? (
                            <div className="p-16 text-center">
                                <Cloud className="w-16 h-16 mx-auto mb-6 text-muted-foreground/20" />
                                <h3 className="text-xl font-medium mb-2">No DNS providers configured</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Add a DNS provider to enable wildcard certificate issuance via DNS-01 challenges.
                                </p>
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Provider
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Default</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {providers.map((provider) => {
                                        const type = providerTypes.find(t => t.id === provider.provider);
                                        return (
                                            <TableRow key={provider.id} className="group">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                                            <Cloud className="w-4 h-4" />
                                                        </div>
                                                        {provider.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{type?.name || provider.provider}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {provider.is_default ? (
                                                        <Badge className="bg-amber-600"><Star className="w-3 h-3 mr-1" /> Default</Badge>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(provider.id)}>
                                                            Set Default
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={provider.enabled}
                                                            onCheckedChange={(checked) => handleToggleEnabled(provider.id, checked)}
                                                        />
                                                        <span className={provider.enabled ? "text-emerald-500" : "text-muted-foreground"}>
                                                            {provider.enabled ? "Active" : "Disabled"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteId(provider.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Supported Providers Reference */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Supported Providers ({providerTypes.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {providerTypes.map((type) => (
                        <Card key={type.id} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setDialogOpen(true); handleProviderSelect(type.id); }}>
                            <div className="flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium truncate">{type.name}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete DNS Provider?"
                description="This action cannot be undone. This will permanently delete the DNS provider configuration."
                onConfirm={() => deleteId && handleDelete(deleteId)}
                variant="destructive"
            />
        </div >
    );
}
