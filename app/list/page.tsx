"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  Loader2,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface MyListItemData {
  id: string;
  itemKey: string;
  itemLabel: string;
  quantity: number | null;
  timesPurchased: number;
  purchasedAt: string | null;
}

const ANON_VISITOR_KEY = "anonVisitorId"; // Must match lib/identity-client.ts

function ListPageContent() {
  const searchParams = useSearchParams();
  const srcBatch = searchParams.get("srcBatch");
  const srcTag = searchParams.get("srcTag");

  const [items, setItems] = useState<MyListItemData[]>([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create anonVisitorId from localStorage
  const getAnonVisitorId = useCallback((): string | null => {
    try {
      let vid = localStorage.getItem(ANON_VISITOR_KEY);
      if (!vid) {
        vid = uuidv4();
        localStorage.setItem(ANON_VISITOR_KEY, vid);
      }
      return vid;
    } catch {
      // localStorage blocked
      return null;
    }
  }, []);

  // NFC tap attribution is now handled globally by TapAttribution in root layout
  // Just mark as identified so other effects can proceed
  useEffect(() => {
    if (!identified) setIdentified(true);
  }, [identified]);

  // Load list items
  const loadItems = useCallback(async () => {
    const anonVisitorId = getAnonVisitorId();
    if (!anonVisitorId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/list/my?vid=${encodeURIComponent(anonVisitorId)}&srcBatch=${srcBatch || ""}&srcTag=${srcTag || ""}`
      );
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
      }
    } catch (err) {
      console.error("[List] Failed to load items:", err);
      setError("Failed to load list");
    } finally {
      setIsLoading(false);
    }
  }, [getAnonVisitorId, srcBatch, srcTag]);

  useEffect(() => {
    if (identified) {
      loadItems();
    }
  }, [identified, loadItems]);

  // Add item to list
  const addItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;

    const anonVisitorId = getAnonVisitorId();
    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/list/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonVisitorId,
          itemLabel: label,
          srcBatch: srcBatch || undefined,
          srcTag: srcTag || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewItemLabel("");
        await loadItems();
      } else {
        setError(data.error || "Failed to add item");
      }
    } catch {
      setError("Failed to add item");
    } finally {
      setIsAdding(false);
    }
  };

  // Mark item as purchased
  const markPurchased = async (itemId: string) => {
    const anonVisitorId = getAnonVisitorId();
    try {
      const res = await fetch("/api/list/my", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonVisitorId,
          itemId,
          action: "purchase",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadItems();
      }
    } catch {
      setError("Failed to update item");
    }
  };

  // Update quantity
  const updateQuantity = async (itemId: string, delta: number) => {
    const anonVisitorId = getAnonVisitorId();
    try {
      const res = await fetch("/api/list/my", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonVisitorId,
          itemId,
          action: "quantity",
          delta,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadItems();
      }
    } catch {
      setError("Failed to update quantity");
    }
  };

  // Remove item
  const removeItem = async (itemId: string) => {
    const anonVisitorId = getAnonVisitorId();
    try {
      const res = await fetch("/api/list/my", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonVisitorId,
          itemId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadItems();
      }
    } catch {
      setError("Failed to remove item");
    }
  };

  const activeItems = items.filter((i) => !i.purchasedAt);
  const purchasedItems = items.filter((i) => !!i.purchasedAt);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">My List</h1>
            {srcBatch && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                via {srcBatch}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Add Item */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Add an item..."
            className={cn(
              "flex-1 px-4 py-3 rounded-xl",
              "bg-muted border-2 border-transparent",
              "focus:border-primary-500 focus:bg-card",
              "focus-ring text-foreground placeholder:text-muted-foreground"
            )}
          />
          <button
            onClick={addItem}
            disabled={!newItemLabel.trim() || isAdding}
            className={cn(
              "px-4 py-3 rounded-xl font-medium",
              "bg-primary-500 text-white",
              "hover:bg-primary-600 active:scale-95",
              "disabled:opacity-50 transition-all"
            )}
          >
            {isAdding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Active Items */}
            {activeItems.length === 0 && purchasedItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Your list is empty</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Add items above to get started
                </p>
              </div>
            ) : (
              <>
                {activeItems.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      To Buy ({activeItems.length})
                    </h2>
                    <div className="space-y-2">
                      {activeItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl",
                            "bg-card border border-border",
                            "hover:border-primary-200 dark:hover:border-primary-800",
                            "transition-colors"
                          )}
                        >
                          {/* Mark purchased */}
                          <button
                            onClick={() => markPurchased(item.id)}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              "border-2 border-muted-foreground/30",
                              "hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950",
                              "transition-colors"
                            )}
                          >
                            <Check className="w-4 h-4 text-transparent hover:text-primary-500" />
                          </button>

                          {/* Item label */}
                          <span className="flex-1 font-medium text-foreground">
                            {item.itemLabel}
                          </span>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Purchased Items */}
                {purchasedItems.length > 0 && (
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Purchased ({purchasedItems.length})
                    </h2>
                    <div className="space-y-2">
                      {purchasedItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl",
                            "bg-muted/50 border border-border/50"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-accent-600" />
                          </div>
                          <span className="flex-1 line-through text-muted-foreground">
                            {item.itemLabel}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ×{item.timesPurchased}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }
    >
      <ListPageContent />
    </Suspense>
  );
}
