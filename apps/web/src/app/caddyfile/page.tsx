"use client";

import * as React from "react";
import { useState, useRef } from "react";
import {
    Play,
    Save,
    Copy,
    Check,
    AlertTriangle,
    FileText,
    Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    getConfig,
    validateCaddyfile,
} from "@/lib/api";
import Editor, { OnMount } from "@monaco-editor/react";

interface ValidationResult {
    valid: boolean;
    error?: string;
    message?: string;
    json?: string;
}

export default function CaddyfilePage() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const editorRef = useRef<any>(null);

    React.useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        try {
            // Need to get adapter config first, but GET /config returns JSON.
            // We want text/caddyfile if possible.
            // But if we only have /config endpoint, we get JSON.
            // For now, start with empty or template if we can't reverse adapt easily without an endpoint.
            // Wait, we have /api/config/adapt endpoint but that ADAPTS TO JSON.
            // Changing JSON -> Caddyfile is hard.
            // Maybe this page is just for "Validation Lab" and "New Config"?
            // Or maybe we fetch the current Caddyfile if we stored it?
            // Existing implementation just started empty or previous code.
            // I'll leave it empty/template for now as "Editor / Validator".
            setCode("# Caddyfile\n\n:80 {\n    respond \"Hello, world!\"\n}\n");
        } catch (error) {
            toast.error("Failed to load config");
        } finally {
            setLoading(false);
        }
    }

    async function handleValidate() {
        setValidating(true);
        setValidationResult(null);
        try {
            const res = await validateCaddyfile(code);
            setValidationResult(res);
            if (res.valid) {
                toast.success("Caddyfile is valid");
            } else {
                toast.error("Validation failed");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to validate Caddyfile");
        } finally {
            setValidating(false);
        }
    }

    function handleCopy() {
        navigator.clipboard.writeText(code);
        toast.success("Copied to clipboard");
    }

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Caddyfile Editor</h1>
                    <p className="text-sm text-muted-foreground">Edit and validate Caddy configuration</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCopy}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </Button>
                    <Button onClick={handleValidate} disabled={validating}>
                        {validating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                        Validate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm p-0 bg-[#1e1e1e]">
                        <Editor
                            height="100%"
                            defaultLanguage="dockerfile" // Close enough for basic highlighting
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </Card>
                </div>

                <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
                    {validationResult ? (
                        <Card className={`border-l-4 ${validationResult.valid ? "border-l-green-500" : "border-l-red-500"}`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    {validationResult.valid ? (
                                        <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                                            <Check className="w-6 h-6" />
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold">
                                            {validationResult.valid ? "Valid Configuration" : "Syntax Error"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {validationResult.message}
                                        </p>
                                    </div>
                                </div>

                                {!validationResult.valid && validationResult.error && (
                                    <div className="mt-4 p-3 bg-red-500/10 text-red-400 rounded-md text-sm font-mono whitespace-pre-wrap break-all border border-red-500/20">
                                        {validationResult.error}
                                    </div>
                                )}

                                {validationResult.valid && validationResult.json && (
                                    <div className="mt-4">
                                        <Label className="mb-2 block text-xs uppercase text-muted-foreground">Adapted JSON</Label>
                                        <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-[300px]">
                                            <pre>{JSON.stringify(JSON.parse(validationResult.json), null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-muted/30 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <h3 className="font-medium mb-1">No Validation Results</h3>
                                <p className="text-sm">Run validation to see output here</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
