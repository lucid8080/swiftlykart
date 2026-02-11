"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Tag,
  Copy,
  Power,
  ExternalLink,
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
  country: string | null;
  region: string | null;
}

interface VisitorData {
  id: string;
  anonVisitorId: string;
  tapCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface TagDetail {
  id: string;
  publicUuid: string;
  label: string | null;
  status: string;
  tapCount: number;
  fullUrl: string;
  linkedUserId: string | null;
  linkedUser: { id: string; email: string | null; name: string | null } | null;
  batch: { id: string; slug: string; name: string };
  tapEvents: TapEventData[];
  createdAt: string;
}

interface TagAnalytics {
  uniqueVisitors: number;
  deviceBreakdown: Array<{ device: string; count: number }>;
  tapTimeline: TapEventData[];
  recentVisitors: VisitorData[];
}

export default function TagDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tag, setTag] = useState<TagDetail | null>(null);
  const [analytics, setAnalytics] = useState<TagAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchData();
  }, [session, uuid]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tagRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/nfc-tags/${uuid}`),
        fetch(`/api/admin/analytics/tag/${uuid}`),
      ]);
      const tagData = await tagRes.json();
      const analyticsData = await analyticsRes.json();

      if (tagData.success) setTag(tagData.data);
      else setError(tagData.error);

      if (analyticsData.success) setAnalytics(analyticsData.data);
    } catch {
      setError("Failed to load tag data");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!tag) return;
    setToggling(true);
    try {
      const newStatus = tag.status === "active" ? "disabled" : "active";
      const res = await fetch(`/api/admin/nfc-tags/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTag((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch {
      setError("Failed to update tag");
    } finally {
      setToggling(false);
    }
  };

  const copyUrl = () => {
    if (!tag) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tag.fullUrl);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = tag.fullUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleLinkUser = async () => {
    if (!tag || !linkEmail.trim()) return;
    setLinkLoading(true);
    setLinkError(null);
    setLinkSuccess(null);
    try {
      const res = await fetch(`/api/admin/nfc-tags/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedUserEmail: linkEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTag((prev) =>
          prev
            ? {
                ...prev,
                linkedUserId: data.data.linkedUserId,
                linkedUser: data.data.linkedUser,
              }
            : prev
        );
        setLinkSuccess(`Tag linked to ${data.data.linkedUser?.email || linkEmail}`);
        setLinkEmail("");
      } else {
        setLinkError(data.error || "Failed to link user");
      }
    } catch {
      setLinkError("Failed to link user");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlinkUser = async () => {
    if (!tag) return;
    setLinkLoading(true);
    setLinkError(null);
    setLinkSuccess(null);
    try {
      const res = await fetch(`/api/admin/nfc-tags/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedUserEmail: null }),
      });
      const data = await res.json();
      if (data.success) {
        setTag((prev) =>
          prev ? { ...prev, linkedUserId: null, linkedUser: null } : prev
        );
        setLinkSuccess("User unlinked from tag");
      } else {
        setLinkError(data.error || "Failed to unlink user");
      }
    } catch {
      setLinkError("Failed to unlink user");
    } finally {
      setLinkLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-lg font-semibold">Tag not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/nfc/tags" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-500" />
                <h1 className="text-lg font-semibold">{tag.label || "Tag Detail"}</h1>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{tag.publicUuid}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copyUrl} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-sm hover:bg-muted/80" title="Copy URL">
              <Copy className="w-4 h-4" /> Copy URL
            </button>
            <button
              onClick={toggleStatus}
              disabled={toggling}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium",
                tag.status === "active"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
            >
              <Power className="w-4 h-4" />
              {tag.status === "active" ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" /><span>{error}</span>
          </div>
        )}

        {/* Tag Info */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <span className={cn(
                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                tag.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {tag.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Batch</div>
              <Link href={`/admin/nfc/batches/${tag.batch.slug}`} className="text-primary-500 hover:underline text-sm">
                {tag.batch.name}
              </Link>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Taps</div>
              <div className="text-xl font-bold">{tag.tapCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Unique Visitors</div>
              <div className="text-xl font-bold">{analytics?.uniqueVisitors || 0}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Full URL</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">{tag.fullUrl}</code>
              <a href={tag.fullUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Linked User — all taps on this tag are attributed to this user */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Linked User</h2>
          <p className="text-sm text-muted-foreground">
            Once linked, <strong>all taps</strong> on this tag are attributed to this user — even from other phones or when signed out.
          </p>

          {tag.linkedUser ? (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div>
                <div className="font-medium">{tag.linkedUser.email}</div>
                {tag.linkedUser.name && (
                  <div className="text-sm text-muted-foreground">{tag.linkedUser.name}</div>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-1">{tag.linkedUser.id.slice(0, 12)}...</div>
              </div>
              <button
                onClick={handleUnlinkUser}
                disabled={linkLoading}
                className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                {linkLoading ? "..." : "Unlink"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="user@example.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleLinkUser()}
              />
              <button
                onClick={handleLinkUser}
                disabled={linkLoading || !linkEmail.trim()}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {linkLoading ? "..." : "Link User"}
              </button>
            </div>
          )}

          {linkError && (
            <div className="text-sm text-red-600 dark:text-red-400">{linkError}</div>
          )}
          {linkSuccess && (
            <div className="text-sm text-green-600 dark:text-green-400">{linkSuccess}</div>
          )}
        </div>

        {/* Device Breakdown */}
        {analytics && analytics.deviceBreakdown.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Device Breakdown</h2>
            <div className="grid grid-cols-3 gap-3">
              {analytics.deviceBreakdown.map((d) => (
                <div key={d.device} className="bg-card rounded-xl border border-border p-4 text-center">
                  <div className="text-xl font-bold">{d.count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{d.device}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tap Timeline */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Tap Timeline</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium">Time</th>
                    <th className="px-4 py-3 text-sm font-medium">Visitor</th>
                    <th className="px-4 py-3 text-sm font-medium">Device</th>
                    <th className="px-4 py-3 text-sm font-medium">IP Hash</th>
                    <th className="px-4 py-3 text-sm font-medium">Duplicate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(analytics?.tapTimeline || tag.tapEvents).map((event) => (
                    <tr key={event.id} className={cn("hover:bg-muted/30", event.isDuplicate && "opacity-50")}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(event.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {event.anonVisitorId ? event.anonVisitorId.slice(0, 8) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{event.deviceHint || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {event.ipHash ? event.ipHash.slice(0, 12) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {event.isDuplicate && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            dupe
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(analytics?.tapTimeline || tag.tapEvents).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        No tap events yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent Visitors */}
        {analytics && analytics.recentVisitors.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Recent Visitors</h2>
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
                  {analytics.recentVisitors.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono">{v.anonVisitorId.slice(0, 12)}...</td>
                      <td className="px-4 py-3 text-right font-semibold">{v.tapCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(v.firstSeenAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(v.lastSeenAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
