"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, Upload, Calendar, Lock, Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    getCertificates,
    getCertificate,
    uploadCertificate,
    deleteCertificate,
    type CustomCertificate,
    type CustomCertificateDetail,
} from "@/lib/api";
import { formatDistanceToNow, isAfter } from "date-fns";

export function CertificateManager() {
    const [certificates, setCertificates] = useState<CustomCertificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // View state
    const [viewCert, setViewCert] = useState<CustomCertificateDetail | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [certFile, setCertFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);

    useEffect(() => {
        loadCertificates();
    }, []);

    async function loadCertificates() {
        try {
            const data = await getCertificates();
            setCertificates(data.certificates || []);
        } catch (error) {
            toast.error("Failed to load certificates");
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload() {
        if (!name || !certFile || !keyFile) {
            toast.error("Please fill in all fields");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("cert_file", certFile);
        formData.append("key_file", keyFile);

        try {
            await uploadCertificate(formData);
            toast.success("Certificate uploaded successfully");
            setDialogOpen(false);
            resetForm();
            loadCertificates();
        } catch (error) {
            toast.error("Failed to upload certificate");
            console.error(error);
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this certificate? Site configurations using it might break.")) {
            return;
        }

        try {
            await deleteCertificate(id);
            toast.success("Certificate deleted");
            loadCertificates();
        } catch (error) {
            toast.error("Failed to delete certificate");
        }
    }

    async function handleView(id: string) {
        try {
            const cert = await getCertificate(id);
            setViewCert(cert);
            setViewOpen(true);
        } catch (error) {
            toast.error("Failed to load certificate details");
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard");
    }

    function resetForm() {
        setName("");
        setCertFile(null);
        setKeyFile(null);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Custom Certificates</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage manually uploaded TLS certificates for reuse across sites.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Certificate
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Certificate</DialogTitle>
                            <DialogDescription>
                                Upload a certificate and private key pair (PEM format).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Friendly Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., wildcards-2024"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cert">Certificate File (.crt/.pem)</Label>
                                <Input
                                    id="cert"
                                    type="file"
                                    accept=".crt,.pem,.cer"
                                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="key">Private Key File (.key/.pem)</Label>
                                <Input
                                    id="key"
                                    type="file"
                                    accept=".key,.pem"
                                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Certificate Details</DialogTitle>
                            <DialogDescription>
                                {viewCert?.name}
                            </DialogDescription>
                        </DialogHeader>
                        {viewCert && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Expires</Label>
                                        <div className="font-medium text-sm mt-1">
                                            {new Date(viewCert.expires_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Uploaded</Label>
                                        <div className="font-medium text-sm mt-1">
                                            {new Date(viewCert.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground">Domains</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {viewCert.domains.map(d => (
                                                <Badge key={d} variant="secondary">{d}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Certificate (PEM)</Label>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(viewCert.cert_pem)}>
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                                        {viewCert.cert_pem}
                                    </pre>
                                </div>
                                {viewCert.key_pem && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Private Key (PEM)</Label>
                                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(viewCert.key_pem)}>
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap break-all blur-sm hover:blur-none transition-all">
                                            {viewCert.key_pem}
                                        </pre>
                                        <p className="text-xs text-muted-foreground">Hover to reveal private key</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Domains</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {certificates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    No custom certificates found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            certificates.map((cert) => {
                                const expires = new Date(cert.expires_at);
                                const isExpired = isAfter(new Date(), expires);

                                return (
                                    <TableRow key={cert.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            {cert.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {cert.domains?.map((d) => (
                                                    <Badge key={d} variant="secondary" className="text-xs">
                                                        {d}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span className={isExpired ? "text-destructive font-medium" : ""}>
                                                    {formatDistanceToNow(expires, { addSuffix: true })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-foreground mr-1"
                                                onClick={() => handleView(cert.id)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(cert.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
}
