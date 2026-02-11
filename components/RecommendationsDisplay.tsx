"use client";

import { X, MapPin, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationItem {
  id: string;
  name: string;
  icon: string | null;
}

interface StoreRecommendation {
  storeId: string;
  storeName: string;
  items: RecommendationItem[];
}

interface RecommendationsDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: StoreRecommendation[];
  notFound: RecommendationItem[];
}

export function RecommendationsDisplay({
  isOpen,
  onClose,
  recommendations,
  notFound,
}: RecommendationsDisplayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommendations-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden border border-border max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" />
            <h2 id="recommendations-title" className="text-lg font-semibold text-foreground">
              Where to Find Your Items
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close recommendations"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {recommendations.length === 0 && notFound.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>No recommendations available</p>
            </div>
          ) : (
            <>
              {/* Store Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.storeId}
                      className="p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-foreground">{rec.storeName}</h3>
                        <span className="text-xs text-muted-foreground">
                          ({rec.items.length} {rec.items.length === 1 ? "item" : "items"})
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {rec.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 text-sm text-foreground"
                          >
                            <span className="text-lg" role="img" aria-hidden="true">
                              {item.icon || "🛒"}
                            </span>
                            <span>{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Items Not Found in Any Store */}
              {notFound.length > 0 && (
                <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <h3 className="font-semibold text-foreground mb-2">
                    Items without store information
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    We couldn't find store information for these items. Try checking multiple
                    stores or ask store staff.
                  </p>
                  <ul className="space-y-2">
                    {notFound.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <span className="text-lg" role="img" aria-hidden="true">
                          {item.icon || "🛒"}
                        </span>
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className={cn(
              "w-full px-4 py-3 rounded-lg",
              "bg-primary-500 text-white font-medium",
              "hover:bg-primary-600 active:bg-primary-700",
              "focus-ring transition-colors"
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
