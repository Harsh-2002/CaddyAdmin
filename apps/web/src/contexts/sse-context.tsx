"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./auth-context";

// Event types matching backend
type SSEEventType = "metrics" | "logs" | "sites" | "config" | "heartbeat" | "connected";

interface SSEEvent {
    type: SSEEventType;
    data: unknown;
    timestamp: number;
}

interface SSEContextType {
    isConnected: boolean;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
    lastHeartbeat: number | null;
    subscribe: (eventType: SSEEventType, callback: (data: unknown) => void) => () => void;
    clientCount: number;
}

const SSEContext = createContext<SSEContextType | null>(null);

// Reconnection settings
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_MULTIPLIER = 1.5;

interface SSEProviderProps {
    children: React.ReactNode;
    subscriptions?: SSEEventType[];
}

export function SSEProvider({
    children,
    subscriptions = ["metrics", "sites"]
}: SSEProviderProps) {
    const { isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<SSEContextType["connectionStatus"]>("disconnected");
    const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
    const [clientCount, setClientCount] = useState(0);

    const eventSourceRef = useRef<EventSource | null>(null);
    const listenersRef = useRef<Map<SSEEventType, Set<(data: unknown) => void>>>(new Map());
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Subscribe to specific event type
    const subscribe = useCallback((eventType: SSEEventType, callback: (data: unknown) => void) => {
        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }
        listenersRef.current.get(eventType)!.add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = listenersRef.current.get(eventType);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }, []);

    // Notify all listeners for an event type
    const notifyListeners = useCallback((eventType: SSEEventType, data: unknown) => {
        const listeners = listenersRef.current.get(eventType);
        if (listeners) {
            listeners.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`SSE listener error for ${eventType}:`, error);
                }
            });
        }
    }, []);

    // Connect to SSE
    const connect = useCallback(() => {
        if (!isAuthenticated || eventSourceRef.current) return;

        setConnectionStatus("connecting");

        const subscribeParam = subscriptions.join(",");
        const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/events/stream?subscribe=${subscribeParam}`;

        try {
            const eventSource = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                if (!mountedRef.current) return;
                console.log("SSE: Connected");
                setIsConnected(true);
                setConnectionStatus("connected");
                retryDelayRef.current = INITIAL_RETRY_DELAY; // Reset retry delay
            };

            eventSource.onerror = () => {
                if (!mountedRef.current) return;
                console.log("SSE: Connection error");
                setIsConnected(false);
                setConnectionStatus("error");

                // Close and cleanup
                eventSource.close();
                eventSourceRef.current = null;

                // Schedule reconnect with exponential backoff
                if (isAuthenticated) {
                    const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
                    console.log(`SSE: Reconnecting in ${delay}ms`);
                    retryTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current && isAuthenticated) {
                            retryDelayRef.current = retryDelayRef.current * RETRY_MULTIPLIER;
                            connect();
                        }
                    }, delay);
                }
            };

            // Listen for connected event
            eventSource.addEventListener("connected", (event) => {
                if (!mountedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    console.log("SSE: Session established", data);
                } catch (e) {
                    console.error("SSE: Failed to parse connected event", e);
                }
            });

            // Listen for heartbeat
            eventSource.addEventListener("heartbeat", (event) => {
                if (!mountedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setLastHeartbeat(Date.now());
                    if (data.data?.clients !== undefined) {
                        setClientCount(data.data.clients);
                    }
                    notifyListeners("heartbeat", data);
                } catch (e) {
                    // Heartbeat parse error, ignore
                }
            });

            // Listen for each subscribed event type
            subscriptions.forEach((eventType) => {
                eventSource.addEventListener(eventType, (event) => {
                    if (!mountedRef.current) return;
                    try {
                        const data = JSON.parse(event.data);
                        notifyListeners(eventType, data.data || data);
                    } catch (e) {
                        console.error(`SSE: Failed to parse ${eventType} event`, e);
                    }
                });
            });

        } catch (error) {
            console.error("SSE: Failed to create EventSource", error);
            setConnectionStatus("error");
        }
    }, [isAuthenticated, subscriptions, notifyListeners]);

    // Disconnect from SSE
    const disconnect = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus("disconnected");
    }, []);

    // Connect when authenticated, disconnect when not
    useEffect(() => {
        mountedRef.current = true;

        if (isAuthenticated) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [isAuthenticated, connect, disconnect]);

    const value: SSEContextType = {
        isConnected,
        connectionStatus,
        lastHeartbeat,
        subscribe,
        clientCount,
    };

    return <SSEContext.Provider value={value}>{children}</SSEContext.Provider>;
}

// Hook to use SSE context
export function useSSE() {
    const context = useContext(SSEContext);
    if (!context) {
        throw new Error("useSSE must be used within SSEProvider");
    }
    return context;
}

// Hook to subscribe to a specific event type
export function useSSEEvent<T = unknown>(
    eventType: SSEEventType,
    callback: (data: T) => void,
    deps: React.DependencyList = []
) {
    const { subscribe } = useSSE();

    useEffect(() => {
        const unsubscribe = subscribe(eventType, callback as (data: unknown) => void);
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventType, subscribe, ...deps]);
}

// Hook to get latest event data with auto-refresh
export function useSSEData<T = unknown>(eventType: SSEEventType, initialData: T): T {
    const [data, setData] = useState<T>(initialData);

    useSSEEvent<T>(eventType, (newData) => {
        setData(newData);
    }, []);

    return data;
}
