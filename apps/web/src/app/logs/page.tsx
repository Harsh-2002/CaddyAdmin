"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
    Download,
    RefreshCw,
    Search,
    Pause,
    Play,
    Eraser,
    Filter,
    Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

import { toast } from "sonner";
import {
    getLogs,
    getLogStream,
    type LogEntry,
} from "@/lib/api";

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const [lineCount, setLineCount] = useState("100");
    const [since, setSince] = useState("1h");
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [streaming, setStreaming] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        loadLogs();
        return () => stopStreaming();
    }, []);

    useEffect(() => {
        if (autoRefresh && !streaming) {
            const interval = setInterval(loadLogs, 2000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, searchTerm, levelFilter, lineCount, since, streaming]);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    async function loadLogs() {
        if (streaming) return;
        try {
            const res = await getLogs({
                lines: parseInt(lineCount),
                search: searchTerm,
                level: levelFilter !== "all" ? levelFilter : undefined,
                since: since,
            });
            setLogs(res.logs || []);
        } catch (error) {
            console.error("Failed to load logs");
        } finally {
            setLoading(false);
        }
    }

    function toggleStreaming() {
        if (streaming) {
            stopStreaming();
        } else {
            startStreaming();
        }
    }

    function startStreaming() {
        setStreaming(true);
        setAutoRefresh(false);
        setLogs([]); // Clear for stream

        const es = getLogStream();
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const log = JSON.parse(event.data);
                setLogs((prev) => [...prev, log].slice(-2000));
            } catch (e) {
                // Ignore parse errors
            }
        };

        es.onerror = () => {
            stopStreaming();
            toast.error("Log stream disconnected");
        };
    }

    function stopStreaming() {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setStreaming(false);
    }

    function downloadLogs() {
        const content = logs.map((l) => JSON.stringify(l)).join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `caddy-logs-${new Date().toISOString()}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="h-[calc(100vh-3rem)] md:h-[calc(100vh-4rem)] flex flex-col gap-4">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                    <p className="text-muted-foreground mt-1">Real-time server event monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={streaming ? "destructive" : "default"}
                        onClick={toggleStreaming}
                        size="sm"
                    >
                        {streaming ? (
                            <>
                                <Pause className="w-4 h-4 mr-2" /> Stop Stream
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" /> Live Stream
                            </>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadLogs()} disabled={streaming}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                        <Eraser className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadLogs}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm bg-card">
                <div className="p-3 border-b flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter logs..."
                            className="pl-8 h-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="h-8 w-[110px] bg-background">
                                <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="warn">Warn</SelectItem>
                                <SelectItem value="debug">Debug</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={since} onValueChange={setSince} disabled={streaming}>
                            <SelectTrigger className="h-8 w-[110px] bg-background">
                                <SelectValue placeholder="Time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15m">15m</SelectItem>
                                <SelectItem value="1h">1h</SelectItem>
                                <SelectItem value="6h">6h</SelectItem>
                                <SelectItem value="24h">24h</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4 ml-auto text-sm">
                        {!streaming && (
                            <div className="flex items-center gap-2">
                                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                                <Label htmlFor="auto-refresh" className="whitespace-nowrap">Auto-refresh</Label>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
                            <Label htmlFor="auto-scroll" className="whitespace-nowrap">Auto-scroll</Label>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-[#1e1e1e] relative overflow-hidden font-mono flex flex-col">
                    {/* Sticky Header */}
                    <div className="grid grid-cols-[85px_60px_130px_1fr] gap-2 px-4 py-2 border-b border-white/10 text-[11px] font-bold text-gray-500 select-none bg-[#1e1e1e] z-10">
                        <div>TIMESTAMP</div>
                        <div>LEVEL</div>
                        <div>SOURCE</div>
                        <div>MESSAGE</div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-auto p-4 pt-2 text-[12px] leading-6 text-gray-300 font-medium"
                        style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}
                    >
                        {loading && !streaming ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Loading logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No logs found
                            </div>
                        ) : (
                            logs.map((log, i) => <LogLine key={i} log={log} />)
                        )}
                        {streaming && (
                            <div className="py-2 text-blue-400/50 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Streaming...
                            </div>
                        )}
                    </div>
                </div>

            </Card >
        </div >
    );
}

function JSONHighlighter({ data }: { data: any }) {
    if (!data || Object.keys(data).length === 0) return null;

    return (
        <span className="font-mono text-xs ml-2 space-x-2">
            {Object.entries(data).map(([key, value], i) => (
                <span key={key}>
                    <span className="text-[#9CDCFE]">{key}:</span>
                    <span className={typeof value === 'number' ? "text-[#B5CEA8]" : "text-[#CE9178]"}>
                        {JSON.stringify(value)}
                    </span>
                </span>
            ))}
        </span>
    );
}

function LogLine({ log }: { log: LogEntry }) {
    // Format timestamp
    const timeStr = log.ts
        ? new Date(log.ts * 1000).toISOString().split('T')[1].slice(0, -1) // HH:MM:SS.mmm
        : log.timestamp || "Unknown";

    // Determine level color
    const level = (log.level || "info").toLowerCase();
    let levelColor = "text-blue-400";
    if (level === "error") levelColor = "text-red-500 font-bold";
    if (level === "warn") levelColor = "text-yellow-400";
    if (level === "debug") levelColor = "text-gray-500";

    // Extract extra data ignoring known fields
    const { ts, timestamp, level: l, logger, msg, raw, ...rest } = log;
    const hasExtras = Object.keys(rest).length > 0;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
        toast.success("Log copied to clipboard");
    };

    return (
        <div className="group grid grid-cols-[85px_60px_130px_1fr] gap-2 hover:bg-white/5 px-2 -mx-2 rounded py-0.5 items-start relative select-text">
            {/* Timestamp */}
            <span className="text-[#6A9955] shrink-0 select-none font-normal opacity-80 whitespace-nowrap">
                {timeStr}
            </span>

            {/* Level */}
            <span className={`uppercase shrink-0 whitespace-nowrap ${levelColor}`}>
                {level}
            </span>

            {/* Logger / Group */}
            <span className="text-[#569CD6] shrink-0 font-medium whitespace-nowrap truncate" title={logger || "General"}>
                {logger || "system"}
            </span>

            {/* Message */}
            <span className="text-[#FFFFFF] break-all">
                {msg}
                {hasExtras && <JSONHighlighter data={rest} />}
            </span>

            {/* Copy Button */}
            <button
                onClick={copyToClipboard}
                className="opacity-0 group-hover:opacity-100 absolute right-2 top-0.5 p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-opacity"
                title="Copy Log JSON"
            >
                <Copy className="w-3 h-3" />
            </button>
        </div>
    );
}
