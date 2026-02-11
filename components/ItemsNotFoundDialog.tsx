"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  icon: string | null;
}

interface ItemsNotFoundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onGetRecommendations: (selectedItemIds: string[]) => void;
  isLoading?: boolean;
}

export function ItemsNotFoundDialog({
  isOpen,
  onClose,
  items,
  onGetRecommendations,
  isLoading = false,
}: ItemsNotFoundDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleToggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleGetRecommendations = () => {
    if (selectedIds.size === 0) return;
    onGetRecommendations(Array.from(selectedIds));
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="items-not-found-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden border border-border max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 id="items-not-found-title" className="text-lg font-semibold text-foreground">
            Which items did you not find?
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close dialog"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>No items in your list</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      disabled={isLoading}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl",
                        "transition-colors duration-150",
                        "focus-ring",
                        isSelected
                          ? "bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-2xl" role="img" aria-hidden="true">
                        {item.icon || "🛒"}
                      </span>
                      <span className="flex-1 text-left font-medium text-foreground">
                        {item.name}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={handleGetRecommendations}
            disabled={selectedIds.size === 0 || isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
              "font-medium transition-colors focus-ring",
              selectedIds.size > 0 && !isLoading
                ? "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Finding recommendations...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Get Recommendations ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
