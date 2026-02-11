"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Layers,
  Tag,
  Download,
  Copy,
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
}

interface BatchDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tapCount: number;
  tags: TagData[];
  createdAt: string;
}

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchBatch();
  }, [session, slug]);

  const fetchBatch = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/batches/${slug}`);
      const data = await res.json();
      if (data.success) setBatch(data.data);
      else setError(data.error);
    } catch {
      setError("Failed to load batch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/admin/tags/export?batchSlug=${slug}`, "_blank");
  };

  const copyUrl = (tagUuid: string) => {
    const domain = window.location.host;
    const url = `https://${domain}/t/${slug}/${tagUuid}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-lg font-semibold">Batch not found</p>
          <Link href="/admin/nfc/batches" className="text-primary-500 hover:underline mt-2 block">
            Back to batches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/nfc/batches" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-500" />
                <h1 className="text-lg font-semibold">{batch.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{batch.slug}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/nfc/tag-generator?batch=${slug}`}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600")}
            >
              <Tag className="w-4 h-4" />
              Generate Tags
            </Link>
            <button
              onClick={handleExport}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80")}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-2xl font-bold">{batch.tags.length}</div>
            <div className="text-sm text-muted-foreground">Total Tags</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-2xl font-bold">{batch.tapCount}</div>
            <div className="text-sm text-muted-foreground">Total Taps</div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-2xl font-bold">
              {batch.tags.filter((t) => t.status === "active").length}
            </div>
            <div className="text-sm text-muted-foreground">Active Tags</div>
          </div>
        </div>

        {batch.description && (
          <p className="text-muted-foreground">{batch.description}</p>
        )}

        {/* Tags Table */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Tags ({batch.tags.length})</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium">Label</th>
                    <th className="px-4 py-3 text-sm font-medium">Public UUID</th>
                    <th className="px-4 py-3 text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                    <th className="px-4 py-3 text-sm font-medium">Last Tapped</th>
                    <th className="px-4 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batch.tags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/admin/nfc/tags/${tag.publicUuid}`} className="text-primary-500 hover:underline">
                          {tag.label || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
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
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {tag.lastTappedAt
                          ? new Date(tag.lastTappedAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyUrl(tag.publicUuid)}
                          className="p-1.5 rounded hover:bg-muted"
                          title="Copy tag URL"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {batch.tags.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No tags in this batch.{" "}
                        <Link href={`/admin/nfc/tag-generator?batch=${slug}`} className="text-primary-500 hover:underline">
                          Generate some
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
