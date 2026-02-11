"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TagData {
  id: string;
  publicUuid: string;
  label: string | null;
  status: string;
  tapCount: number;
  lastTappedAt: string | null;
  createdAt: string;
  batch: { slug: string; name: string };
  linkedUserId?: string | null;
  linkedUser?: { id: string; email: string | null; name: string | null } | null;
  uniqueUsersCount?: number;
  users?: { id: string; email: string | null; name: string | null }[];
  mostRecentUser?: { id: string; email: string | null; name: string | null } | null;
}

export default function TagsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tags, setTags] = useState<TagData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchTags();
  }, [session, page, filterBatch, filterStatus]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterBatch) params.set("batchSlug", filterBatch);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/admin/nfc-tags?${params}`);
      const data = await res.json();
      if (data.success) {
        setTags(data.data.tags);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to load tags");
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/admin/nfc" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-500" />
            <h1 className="text-lg font-semibold">All NFC Tags</h1>
            <span className="text-sm text-muted-foreground">({total})</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" /><span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={filterBatch}
            onChange={(e) => { setFilterBatch(e.target.value); setPage(1); }}
            placeholder="Filter by batch slug..."
            className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm w-48")}
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className={cn("px-3 py-2 rounded-lg bg-muted border-2 border-transparent focus:border-primary-500 text-sm")}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
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
                      <th className="px-4 py-3 text-sm font-medium">Label</th>
                      <th className="px-4 py-3 text-sm font-medium">Batch</th>
                      <th className="px-4 py-3 text-sm font-medium">UUID</th>
                      <th className="px-4 py-3 text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                      <th className="px-4 py-3 text-sm font-medium">Linked To</th>
                      <th className="px-4 py-3 text-sm font-medium">Users</th>
                      <th className="px-4 py-3 text-sm font-medium">Last Tapped</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/admin/nfc/tags/${tag.publicUuid}`} className="text-primary-500 hover:underline">
                            {tag.label || "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/admin/nfc/batches/${tag.batch.slug}`} className="text-muted-foreground hover:text-foreground">
                            {tag.batch.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {tag.publicUuid.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                            tag.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {tag.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{tag.tapCount}</td>
                        <td className="px-4 py-3 text-sm">
                          {tag.linkedUser ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium" title={`All taps → ${tag.linkedUser.email}`}>
                              🔗 {tag.linkedUser.email || tag.linkedUser.name || "linked"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {tag.mostRecentUser ? (
                            <div className="space-y-1">
                              <div className="text-primary-500 font-medium">
                                <span title={tag.mostRecentUser.email || ""}>
                                  {tag.mostRecentUser.email || tag.mostRecentUser.name || tag.mostRecentUser.id.slice(0, 8)}
                                </span>
                              </div>
                              {tag.uniqueUsersCount && tag.uniqueUsersCount > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  +{tag.uniqueUsersCount - 1} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {tag.lastTappedAt ? new Date(tag.lastTappedAt).toLocaleString() : "Never"}
                        </td>
                      </tr>
                    ))}
                    {tags.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No tags found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} tags)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg bg-muted disabled:opacity-50"
                  >
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
