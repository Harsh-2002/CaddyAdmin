"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Check auth status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await getCurrentUser();
                if (response.authenticated) {
                    setIsAuthenticated(true);
                    setUsername(response.user.username);
                } else {
                    setIsAuthenticated(false);
                    setUsername(null);
                }
            } catch {
                setIsAuthenticated(false);
                setUsername(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== "/login") {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    const login = async (username: string, password: string) => {
        const response = await apiLogin(username, password);
        if (response.success) {
            setIsAuthenticated(true);
            setUsername(response.user.username);
            router.push("/");
        } else {
            throw new Error("Login failed");
        }
    };

    const logout = async () => {
        try {
            await apiLogout();
        } finally {
            setIsAuthenticated(false);
            setUsername(null);
            router.push("/login");
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
