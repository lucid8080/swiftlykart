"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemAnalytics {
  period: { days: number; since: string };
  mostPurchased: Array<{
    itemKey: string;
    itemLabel: string;
    totalPurchases: number;
    listCount: number;
  }>;
  mostAdded: Array<{
    itemKey: string;
    itemLabel: string;
    addCount: number;
  }>;
  powerUsers: Array<{
    id: string;
    anonVisitorId: string;
    tapCount: number;
    totalPurchases: number;
  }>;
  perBatchItems: Array<{
    batch: { slug: string; name: string } | null;
    itemKey: string;
    itemLabel: string;
    totalPurchases: number;
    listCount: number;
  }>;
}

export default function MyListAnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<ItemAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchData();
  }, [session, days]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/items?days=${days}`);
      const result = await res.json();
      if (result.success) setData(result.data);
      else setError(result.error);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/nfc" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">My List Analytics</h1>
            </div>
          </div>
          {/* Period filter */}
          <div className="flex gap-2">
            {[7, 30, 90, 0].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d || 36500)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium",
                  days === (d || 36500)
                    ? "bg-primary-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {d === 0 ? "All" : `${d}d`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" /><span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Most Purchased */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                Most Purchased Items
              </h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">#</th>
                      <th className="px-4 py-3 text-sm font-medium">Item</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Purchases</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">In Lists</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.mostPurchased.map((item, i) => (
                      <tr key={item.itemKey} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.itemLabel}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.totalPurchases}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.listCount}</td>
                      </tr>
                    ))}
                    {data.mostPurchased.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No purchase data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Most Added */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary-500" />
                Most Added Items
              </h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">#</th>
                      <th className="px-4 py-3 text-sm font-medium">Item</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Times Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.mostAdded.map((item, i) => (
                      <tr key={item.itemKey} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.itemLabel}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.addCount}</td>
                      </tr>
                    ))}
                    {data.mostAdded.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No items added yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Power Users */}
            {data.powerUsers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  Power Users by Purchases
                </h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium">Visitor</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">Purchases</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.powerUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm font-mono">{u.anonVisitorId.slice(0, 12)}...</td>
                          <td className="px-4 py-3 text-right">{u.tapCount}</td>
                          <td className="px-4 py-3 text-right font-semibold">{u.totalPurchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Per-Batch Item Popularity */}
            {data.perBatchItems.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Per-Batch Item Popularity</h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium">Batch</th>
                        <th className="px-4 py-3 text-sm font-medium">Item</th>
                        <th className="px-4 py-3 text-sm font-medium text-right">Purchases</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.perBatchItems.map((item, i) => (
                        <tr key={`${item.batch?.slug}-${item.itemKey}-${i}`} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">
                            {item.batch ? (
                              <Link href={`/admin/nfc/batches/${item.batch.slug}`} className="text-primary-500 hover:underline">
                                {item.batch.name}
                              </Link>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium">{item.itemLabel}</td>
                          <td className="px-4 py-3 text-right font-semibold">{item.totalPurchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
