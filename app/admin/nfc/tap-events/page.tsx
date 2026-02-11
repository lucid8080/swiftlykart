"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TapEventData {
  id: string;
  occurredAt: string;
  ipHash: string | null;
  userAgent: string | null;
  deviceHint: string | null;
  anonVisitorId: string | null;
  isDuplicate: boolean;
  userId: string | null;
  linkedAt: string | null;
  linkMethod: string | null;
  tapperHadSession: boolean;
  user: { id: string; email: string | null; name: string | null } | null;
  batch: { slug: string; name: string };
  tag: { publicUuid: string; label: string | null };
  visitor: { id: string; anonVisitorId: string; tapCount: number; userId: string | null } | null;
}

export default function TapEventsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<TapEventData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterBatch, setFilterBatch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterVisitor, setFilterVisitor] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchEvents();
  }, [session, page]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterBatch) params.set("batchSlug", filterBatch);
      if (filterTag) params.set("tagUuid", filterTag);
      if (filterVisitor) params.set("visitor", filterVisitor);
      if (filterUserId) params.set("userId", filterUserId);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(`/api/admin/tap-events?${params}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to load tap events");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchEvents();
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/admin/nfc" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            <h1 className="text-lg font-semibold">Tap Events</h1>
            <span className="text-sm text-muted-foreground">({total})</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" /><span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Batch Slug</label>
            <input
              type="text"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              placeholder="batch-slug"
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm w-40")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Tag UUID</label>
            <input
              type="text"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder="tag-uuid"
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm w-40")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Visitor ID</label>
            <input
              type="text"
              value={filterVisitor}
              onChange={(e) => setFilterVisitor(e.target.value)}
              placeholder="anon-visitor-id"
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm w-40")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">User ID</label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="user-id"
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm w-40")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm")}
            />
          </div>
          <button
            onClick={applyFilters}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
          >
            <Search className="w-4 h-4" /> Filter
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-3 text-sm font-medium">Time</th>
                      <th className="px-3 py-3 text-sm font-medium">Batch</th>
                      <th className="px-3 py-3 text-sm font-medium">Tag</th>
                      <th className="px-3 py-3 text-sm font-medium">User</th>
                      <th className="px-3 py-3 text-sm font-medium">Visitor</th>
                      <th className="px-3 py-3 text-sm font-medium">Status</th>
                      <th className="px-3 py-3 text-sm font-medium">Linked</th>
                      <th className="px-3 py-3 text-sm font-medium">Method</th>
                      <th className="px-3 py-3 text-sm font-medium">IP Hash</th>
                      <th className="px-3 py-3 text-sm font-medium">Device</th>
                      <th className="px-3 py-3 text-sm font-medium">Dupe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((event) => (
                      <tr key={event.id} className={cn("hover:bg-muted/30", event.isDuplicate && "opacity-50")}>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {new Date(event.occurredAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Link href={`/admin/nfc/batches/${event.batch.slug}`} className="text-primary-500 hover:underline">
                            {event.batch.slug}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Link href={`/admin/nfc/tags/${event.tag.publicUuid}`} className="text-primary-500 hover:underline">
                            {event.tag.label || event.tag.publicUuid.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {event.user ? (
                            <span className="text-primary-500" title={event.user.email || ""}>
                              {event.user.email || event.user.name || event.user.id.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                          {event.anonVisitorId ? event.anonVisitorId.slice(0, 8) + "..." : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {event.tapperHadSession ? (
                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                              Signed In
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">
                              Signed Out
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {event.linkedAt ? new Date(event.linkedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {event.linkMethod ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                              {event.linkMethod}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                          {event.ipHash ? event.ipHash.slice(0, 10) + "..." : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs capitalize">{event.deviceHint || "—"}</td>
                        <td className="px-3 py-2">
                          {event.isDuplicate && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              yes
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                          No tap events found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} events)
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-muted disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-muted disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
