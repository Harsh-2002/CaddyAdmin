"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Server,
  Route,
  History,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSites, getUpstreams, getHealth, getHistory, type Site, type Upstream, type HealthStatus, type ConfigHistory } from "@/lib/api";
import { WelcomeHero } from "@/components/onboarding/welcome-hero";

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [history, setHistory] = useState<ConfigHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sitesRes, upstreamsRes, healthRes, historyRes] = await Promise.all([
          getSites(),
          getUpstreams(),
          getHealth(),
          getHistory({ limit: 5 }),
        ]);
        setSites(sitesRes.sites || []);
        setUpstreams(upstreamsRes.upstreams || []);
        setHealth(healthRes);
        setHistory(historyRes.history || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeSites = sites.filter((s) => s.enabled).length;
  const healthyUpstreams = upstreams.filter((u) => u.healthy).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Caddy proxy configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <Badge
              variant={health.components.caddy === "healthy" ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {health.components.caddy === "healthy" ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              Caddy {health.components.caddy}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards - Colored Gradients */}
      {(loading || sites.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-blue-500/20 bg-blue-500/5">
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Sites</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{sites.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSites} active
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-500/20 bg-green-500/5">
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Upstreams</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">{upstreams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {healthyUpstreams} healthy
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-purple-500/20 bg-purple-500/5">
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Routes</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Route className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {sites.reduce((acc, s) => acc + (s.routes?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all sites
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-orange-500/20 bg-orange-500/5">
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Config Changes</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <History className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{history.length}+</div>
              <p className="text-xs text-muted-foreground mt-1">
                Recent changes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sites and Recent Activity or Onboarding */}
      {!loading && sites.length === 0 ? (
        <WelcomeHero />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sites List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sites</CardTitle>
                <CardDescription>Your configured domains</CardDescription>
              </div>
              <Link href="/sites">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Site
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sites configured yet</p>
                  <Link href="/sites">
                    <Button variant="link">Create your first site</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sites.slice(0, 5).map((site) => (
                    <Link
                      key={site.id}
                      href={`/sites/${site.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{site.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {site.hosts?.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={site.enabled ? "default" : "secondary"}>
                          {site.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest configuration changes</CardDescription>
              </div>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div
                        className={`p-2 rounded-lg ${entry.action === "create"
                          ? "bg-green-500/10 text-green-500"
                          : entry.action === "delete"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-blue-500/10 text-blue-500"
                          }`}
                      >
                        {entry.action === "create" ? (
                          <Plus className="w-4 h-4" />
                        ) : entry.action === "delete" ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <History className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.action} {entry.resource_type}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.resource_name || entry.resource_id}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
