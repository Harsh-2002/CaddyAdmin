"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clipboard, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language?: "json" | "caddyfile";
    readOnly?: boolean;
    className?: string;
    placeholder?: string;
}

export function CodeEditor({
    value = "",
    onChange,
    language = "json",
    readOnly = false,
    className,
    placeholder
}: CodeEditorProps) {
    const [copied, setCopied] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = React.useRef<HTMLDivElement>(null);

    // Sync scroll between textarea and line numbers
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const lines = value.split("\n");
    // Ensure at least one line number is shown even if empty
    const lineCount = Math.max(lines.length, 1);

    return (
        <div className={cn("relative group border rounded-lg bg-[#0d0d0d] overflow-hidden flex flex-col", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#161616]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 font-mono uppercase tracking-wider">
                        {language}
                    </span>
                    {readOnly && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-white/10 text-muted-foreground">
                            Read Only
                        </Badge>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-white"
                    onClick={copyToClipboard}
                >
                    {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                </Button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative min-h-[300px]">
                {/* Line Numbers */}
                <div
                    ref={lineNumbersRef}
                    className="absolute left-0 top-0 bottom-0 w-12 pt-4 px-2 text-right bg-[#111] text-gray-700 font-mono text-xs leading-6 overflow-hidden select-none border-r border-white/5 z-10"
                >
                    {Array.from({ length: lineCount }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => !readOnly && onChange?.(e.target.value)}
                    onScroll={handleScroll}
                    className={cn(
                        "absolute inset-0 w-full h-full bg-transparent text-gray-300 font-mono text-xs leading-6 p-4 pt-4 pl-16 resize-none focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent selection:bg-indigo-500/30",
                        readOnly ? "cursor-default" : "cursor-text"
                    )}
                    spellCheck="false"
                    readOnly={readOnly}
                    placeholder={placeholder}
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace" }}
                />
            </div>
        </div>
    );
}
