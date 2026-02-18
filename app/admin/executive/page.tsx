"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Zap,
  Users,
  ShoppingCart,
  ListChecks,
  Loader2,
  AlertCircle,
  Ban,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailySiteRow {
  date: string;
  tapsTotal: number;
  uniqueVisitorsEst: number;
  usersNew: number;
  usersActiveEst: number;
  listsCreated: number;
  itemsAdded: number;
  itemsPurchased: number;
}

interface ExecutiveData {
  enabled: boolean;
  rows: DailySiteRow[];
  kpi: {
    taps30d: number;
    visitors30d: number;
    purchased30d: number;
    lists30d: number;
  };
}

interface PowerUser {
  visitorId: string;
  userId: string | null;
  userEmail: string | null;
  totalScore: number;
  taps: number;
  activeDays: number;
}

interface PowerUsersData {
  topVisitors: PowerUser[];
  kpi: {
    powerUsersCount: number;
    powerUserShare: number;
  };
}

export default function ExecutivePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [powerUsers, setPowerUsers] = useState<PowerUsersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchExecutiveData();
      fetchPowerUsers();
    }
  }, [session]);

  const fetchExecutiveData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/executive");
      if (res.status === 404) {
        setDisabled(true);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load executive data");
      }
    } catch {
      setError("Failed to load executive data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPowerUsers = async () => {
    try {
      const res = await fetch("/api/admin/executive/power-users");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPowerUsers(json.data);
        }
      }
      // Silently fail if endpoint doesn't exist or is disabled
    } catch {
      // Silently fail
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  // Feature flag disabled state
  if (disabled) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link
              href="/admin/nfc"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">Executive View</h1>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-16 text-center">
          <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Executive view is currently disabled
          </h2>
          <p className="text-muted-foreground mb-6">
            Set <code className="bg-muted px-1.5 py-0.5 rounded text-sm">ENABLE_EXECUTIVE_VIEW=&quot;true&quot;</code> in your environment to enable this page.
          </p>
          <Link
            href="/admin/nfc"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-primary-500 text-white hover:bg-primary-600",
              "transition-colors"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to NFC Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/nfc"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">Executive View</h1>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Last 30 days &middot; Read-only
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <>
            {/* KPI Cards */}
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                30-Day Totals
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard
                  icon={<Zap className="w-5 h-5" />}
                  label="Taps"
                  value={data.kpi.taps30d}
                  color="text-blue-500"
                />
                <KpiCard
                  icon={<Users className="w-5 h-5" />}
                  label="Unique Visitors Est."
                  value={data.kpi.visitors30d}
                  color="text-green-500"
                />
                <KpiCard
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label="Items Purchased"
                  value={data.kpi.purchased30d}
                  color="text-orange-500"
                />
                <KpiCard
                  icon={<ListChecks className="w-5 h-5" />}
                  label="Lists Created"
                  value={data.kpi.lists30d}
                  color="text-purple-500"
                />
              </div>
            </section>

            {/* Daily Table (last 14 days) */}
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Daily Breakdown (Last 14 Days)
              </h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">
                          Taps
                        </th>
                        <th className="px-4 py-3 text-sm font-medium text-right">
                          Visitors Est.
                        </th>
                        <th className="px-4 py-3 text-sm font-medium text-right">
                          Items Purchased
                        </th>
                        <th className="px-4 py-3 text-sm font-medium text-right">
                          Lists Created
                        </th>
                        <th className="px-4 py-3 text-sm font-medium text-right">
                          New Users
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.rows.slice(0, 14).map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-sm">
                            {formatDisplayDate(row.date)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {row.tapsTotal.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.uniqueVisitorsEst.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.itemsPurchased.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.listsCreated.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {row.usersNew.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {data.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No aggregated data yet. Run the daily aggregation
                            job to populate this view.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {data.rows.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <p>
                  To populate data, run:{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded">
                    npx tsx scripts/runAggregateDaily.ts
                  </code>
                </p>
              </div>
            )}

            {/* Top Power Users Section */}
            {powerUsers && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Top Power Users (Last 30 Days)
                </h2>

                {/* Power User KPI Tiles */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <KpiCard
                    icon={<Trophy className="w-5 h-5" />}
                    label="Power Users (30d)"
                    value={powerUsers.kpi.powerUsersCount}
                    color="text-yellow-500"
                  />
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="text-indigo-500 mb-2">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {powerUsers.kpi.powerUserShare.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Power User Share (30d)
                    </div>
                  </div>
                </div>

                {/* Power Users Table */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-4 py-3 text-sm font-medium">Rank</th>
                          <th className="px-4 py-3 text-sm font-medium">User</th>
                          <th className="px-4 py-3 text-sm font-medium">Visitor ID</th>
                          <th className="px-4 py-3 text-sm font-medium text-right">
                            Total Score
                          </th>
                          <th className="px-4 py-3 text-sm font-medium text-right">
                            Taps (30d)
                          </th>
                          <th className="px-4 py-3 text-sm font-medium text-right">
                            Active Days
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {powerUsers.topVisitors.map((user, idx) => (
                          <tr key={user.visitorId} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-sm">
                              #{idx + 1}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.userEmail ? (
                                <span className="font-medium">{user.userEmail}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">
                              {user.visitorId.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {user.totalScore.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {user.taps.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {user.activeDays}
                            </td>
                          </tr>
                        ))}
                        {powerUsers.topVisitors.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-muted-foreground"
                            >
                              No power user data yet. Run the daily aggregation job to
                              populate this view.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={cn("mb-2", color)}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
