"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Batch {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagCount: number;
  tapCount: number;
  uniqueVisitors: number;
  createdAt: string;
}

export default function BatchesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchBatches();
  }, [session]);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/batches");
      const data = await res.json();
      if (data.success) setBatches(data.data);
      else setError(data.error);
    } catch {
      setError("Failed to load batches");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formSlug.trim() || !formName.trim()) return;
    setFormLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug.trim(),
          name: formName.trim(),
          description: formDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormSlug("");
        setFormName("");
        setFormDesc("");
        fetchBatches();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to create batch");
    } finally {
      setFormLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/nfc" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">Tag Batches</h1>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-primary-500 text-white font-medium text-sm",
              "hover:bg-primary-600"
            )}
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-sm font-medium">Slug</th>
                <th className="px-4 py-3 text-sm font-medium text-right">Tags</th>
                <th className="px-4 py-3 text-sm font-medium text-right">Taps</th>
                <th className="px-4 py-3 text-sm font-medium text-right">Visitors</th>
                <th className="px-4 py-3 text-sm font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/nfc/batches/${batch.slug}`} className="text-primary-500 hover:underline">
                      {batch.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{batch.slug}</td>
                  <td className="px-4 py-3 text-right">{batch.tagCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">{batch.tapCount}</td>
                  <td className="px-4 py-3 text-right">{batch.uniqueVisitors}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No batches yet. Click &quot;New Batch&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Batch</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Slug (URL-friendly)</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="homedepot-2026-q1"
                  className={cn("w-full px-4 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500 focus:bg-card focus-ring font-mono")}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Home Depot Q1 2026"
                  className={cn("w-full px-4 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500 focus:bg-card focus-ring")}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description (optional)</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Campaign description..."
                  rows={2}
                  className={cn("w-full px-4 py-2.5 rounded-xl bg-muted border-2 border-transparent focus:border-primary-500 focus:bg-card focus-ring resize-none")}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl bg-muted font-medium">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formSlug.trim() || !formName.trim() || formLoading}
                className={cn("flex-1 py-2.5 rounded-xl font-medium bg-primary-500 text-white disabled:opacity-50")}
              >
                {formLoading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
