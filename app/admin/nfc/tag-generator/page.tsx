"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Plus,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Batch {
  id: string;
  slug: string;
  name: string;
}

interface GeneratedTag {
  id: string;
  publicUuid: string;
  label: string | null;
  fullUrl: string;
  batch: { slug: string };
}

function TagGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [tagCount, setTagCount] = useState(10);
  const [labelPrefix, setLabelPrefix] = useState("");
  const [generatedTags, setGeneratedTags] = useState<GeneratedTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New batch form
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchSlug, setNewBatchSlug] = useState("");
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchDesc, setNewBatchDesc] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchBatches();
  }, [session]);

  useEffect(() => {
    const batchParam = searchParams.get("batch");
    if (batchParam) setSelectedBatch(batchParam);
  }, [searchParams]);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/batches");
      const data = await res.json();
      if (data.success) setBatches(data.data);
    } catch {
      setError("Failed to load batches");
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBatch = async () => {
    if (!newBatchSlug.trim() || !newBatchName.trim()) return;
    setCreatingBatch(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newBatchSlug.trim(),
          name: newBatchName.trim(),
          description: newBatchDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewBatch(false);
        setSelectedBatch(data.data.slug);
        setNewBatchSlug("");
        setNewBatchName("");
        setNewBatchDesc("");
        await fetchBatches();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to create batch");
    } finally {
      setCreatingBatch(false);
    }
  };

  const generateTags = async () => {
    if (!selectedBatch || tagCount < 1) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/tags/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSlug: selectedBatch,
          count: tagCount,
          labelPrefix: labelPrefix.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedTags(data.data.tags);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to generate tags");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!selectedBatch) return;
    window.open(`/api/admin/tags/export?batchSlug=${selectedBatch}`, "_blank");
  };

  const copyUrl = (tag: GeneratedTag) => {
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
    setCopiedId(tag.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading" || isLoading) {
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
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h1 className="text-lg font-semibold">Tag Generator & Export</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-xs underline">dismiss</button>
          </div>
        )}

        {/* Generator Form */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Generate NFC Tag URLs</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Batch</label>
              <div className="flex gap-2">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className={cn("flex-1 px-3 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500")}
                >
                  <option value="">Select a batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.slug}>{b.name} ({b.slug})</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewBatch(!showNewBatch)}
                  className="px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/80"
                  title="Create new batch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Number of Tags</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={tagCount}
                onChange={(e) => setTagCount(parseInt(e.target.value) || 1)}
                className={cn("w-full px-3 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-muted-foreground mb-1 block">Label Prefix (optional)</label>
              <input
                type="text"
                value={labelPrefix}
                onChange={(e) => setLabelPrefix(e.target.value)}
                placeholder='e.g. "HD Tag" → "HD Tag 001", "HD Tag 002"...'
                className={cn("w-full px-3 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500")}
              />
            </div>
          </div>

          {/* New batch inline form */}
          {showNewBatch && (
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <h3 className="font-medium">Create New Batch</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newBatchSlug}
                  onChange={(e) => setNewBatchSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="batch-slug"
                  className={cn("px-3 py-2 rounded-lg bg-card border-2 border-transparent focus:border-primary-500 font-mono")}
                />
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="Batch Name"
                  className={cn("px-3 py-2 rounded-lg bg-card border-2 border-transparent focus:border-primary-500")}
                />
              </div>
              <input
                type="text"
                value={newBatchDesc}
                onChange={(e) => setNewBatchDesc(e.target.value)}
                placeholder="Description (optional)"
                className={cn("w-full px-3 py-2 rounded-lg bg-card border-2 border-transparent focus:border-primary-500")}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowNewBatch(false)} className="px-4 py-2 rounded-lg bg-card font-medium text-sm">Cancel</button>
                <button
                  onClick={createNewBatch}
                  disabled={!newBatchSlug.trim() || !newBatchName.trim() || creatingBatch}
                  className={cn("px-4 py-2 rounded-lg bg-primary-500 text-white font-medium text-sm disabled:opacity-50")}
                >
                  {creatingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Batch"}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={generateTags}
              disabled={!selectedBatch || tagCount < 1 || isGenerating}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
                "bg-primary-500 text-white hover:bg-primary-600",
                "disabled:opacity-50 transition-all"
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
              Generate {tagCount} Tags
            </button>

            {selectedBatch && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted font-medium hover:bg-muted/80"
              >
                <Download className="w-5 h-5" />
                Export All Tags (CSV)
              </button>
            )}
          </div>
        </div>

        {/* Generated Tags Table */}
        {generatedTags.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Generated Tags ({generatedTags.length})
              </h2>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">Label</th>
                      <th className="px-4 py-3 text-sm font-medium">Batch</th>
                      <th className="px-4 py-3 text-sm font-medium">Public UUID</th>
                      <th className="px-4 py-3 text-sm font-medium">Full URL</th>
                      <th className="px-4 py-3 text-sm font-medium">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {generatedTags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{tag.label || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{tag.batch.slug}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{tag.publicUuid}</td>
                        <td className="px-4 py-3 text-xs text-primary-500 break-all max-w-xs">
                          <a href={tag.fullUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {tag.fullUrl}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyUrl(tag)}
                            className="p-1.5 rounded hover:bg-muted"
                          >
                            {copiedId === tag.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function TagGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }
    >
      <TagGeneratorContent />
    </Suspense>
  );
}
