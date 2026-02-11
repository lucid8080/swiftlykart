"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Tag,
  Layers,
  Users,
  ShoppingCart,
  Zap,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Summary {
  totalTaps: number;
  tapsToday: number;
  tapsThisWeek: number;
  tapsThisMonth: number;
  totalTags: number;
  totalBatches: number;
  uniqueVisitors: number;
  topBatches: Array<{
    slug: string;
    name: string;
    tapCount: number;
    tagCount: number;
  }>;
  topTags: Array<{
    publicUuid: string;
    label: string | null;
    batchSlug: string;
    batchName: string;
    tapCount: number;
  }>;
  powerUsers: Array<{
    id: string;
    anonVisitorId: string;
    tapCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
  }>;
  mostPurchased: Array<{
    itemKey: string;
    itemLabel: string;
    totalPurchases: number;
    listCount: number;
  }>;
}

export default function NfcDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchSummary();
    }
  }, [session]);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/summary");
      const data = await res.json();
      if (data.success) setSummary(data.data);
      else setError(data.error);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setIsLoading(false);
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

  const navLinks = [
    { href: "/admin/nfc/batches", label: "Batches", icon: Layers, desc: "Manage tag batches" },
    { href: "/admin/nfc/tags", label: "Tags", icon: Tag, desc: "View all NFC tags" },
    { href: "/admin/nfc/tap-events", label: "Tap Events", icon: Zap, desc: "Browse tap logs" },
    { href: "/admin/nfc/tag-generator", label: "Tag Generator", icon: TrendingUp, desc: "Generate & export tags" },
    { href: "/admin/nfc/my-list-analytics", label: "My List Analytics", icon: ShoppingCart, desc: "Item purchase analytics" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/items" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">NFC Tag Analytics</h1>
            </div>
          </div>
          <Link
            href="/admin/users"
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium",
              "bg-muted text-foreground hover:bg-muted/80",
              "focus-ring transition-colors-fast"
            )}
          >
            👥 Users
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "p-4 rounded-xl border border-border bg-card",
                "hover:border-primary-300 dark:hover:border-primary-700",
                "transition-colors group"
              )}
            >
              <link.icon className="w-5 h-5 text-primary-500 mb-2" />
              <div className="font-medium text-sm">{link.label}</div>
              <div className="text-xs text-muted-foreground">{link.desc}</div>
            </Link>
          ))}
        </div>

        {summary && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Taps" value={summary.totalTaps} />
              <StatCard label="Taps Today" value={summary.tapsToday} />
              <StatCard label="This Week" value={summary.tapsThisWeek} />
              <StatCard label="Unique Visitors" value={summary.uniqueVisitors} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Tags" value={summary.totalTags} />
              <StatCard label="Total Batches" value={summary.totalBatches} />
              <StatCard label="This Month" value={summary.tapsThisMonth} />
              <StatCard label="Power Users" value={summary.powerUsers.length} />
            </div>

            {/* Top Batches */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-500" />
                Top Batches
              </h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">Batch</th>
                      <th className="px-4 py-3 text-sm font-medium">Slug</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Tags</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.topBatches.map((b) => (
                      <tr key={b.slug} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/admin/nfc/batches/${b.slug}`} className="text-primary-500 hover:underline">
                            {b.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{b.slug}</td>
                        <td className="px-4 py-3 text-right">{b.tagCount}</td>
                        <td className="px-4 py-3 text-right font-semibold">{b.tapCount}</td>
                      </tr>
                    ))}
                    {summary.topBatches.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No batches yet. <Link href="/admin/nfc/tag-generator" className="text-primary-500 hover:underline">Create one</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Top Tags */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-500" />
                Top Tags
              </h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">Label</th>
                      <th className="px-4 py-3 text-sm font-medium">Batch</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.topTags.map((t) => (
                      <tr key={t.publicUuid} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/admin/nfc/tags/${t.publicUuid}`} className="text-primary-500 hover:underline">
                            {t.label || t.publicUuid.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{t.batchName}</td>
                        <td className="px-4 py-3 text-right font-semibold">{t.tapCount}</td>
                      </tr>
                    ))}
                    {summary.topTags.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No tags yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Power Users */}
            {summary.powerUsers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  Power Users
                </h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium">Visitor ID</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                        <th className="px-4 py-3 text-sm font-medium">First Seen</th>
                        <th className="px-4 py-3 text-sm font-medium">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.powerUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-mono">{u.anonVisitorId.slice(0, 12)}...</td>
                          <td className="px-4 py-3 text-right font-semibold">{u.tapCount}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(u.firstSeenAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(u.lastSeenAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Most Purchased */}
            {summary.mostPurchased.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary-500" />
                  Most Purchased Items
                </h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium">Item</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">Purchases</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">In Lists</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.mostPurchased.map((item) => (
                        <tr key={item.itemKey} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{item.itemLabel}</td>
                          <td className="px-4 py-3 text-right font-semibold">{item.totalPurchases}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.listCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
