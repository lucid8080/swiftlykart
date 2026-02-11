"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSettings {
  showPriceRange: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/settings");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);

  // Load settings
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "admin") {
      return;
    }

    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();

        if (json.success && json.data) {
          setSettings(json.data);
        } else {
          setError(json.error || "Failed to load settings");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [status, session]);

  const handleToggle = async (value: boolean) => {
    if (!settings || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPriceRange: value }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setSettings(json.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      setError("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/items"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-500" />
            <h1 className="text-3xl font-bold">App Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage global application settings that apply to all users.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className={cn(
              "mb-4 p-4 rounded-lg flex items-center gap-3",
              "bg-red-50 dark:bg-red-950/30",
              "text-red-700 dark:text-red-400",
              "border border-red-200 dark:border-red-800"
            )}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className={cn(
              "mb-4 p-4 rounded-lg flex items-center gap-3",
              "bg-green-50 dark:bg-green-950/30",
              "text-green-700 dark:text-green-400",
              "border border-green-200 dark:border-green-800"
            )}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Settings updated successfully</span>
          </div>
        )}

        {/* Settings Card */}
        {settings && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="space-y-6">
              {/* Price Range Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Show Price Range in My List</h3>
                  <p className="text-sm text-muted-foreground">
                    Controls whether users see the estimated price range (min–max totals) in the
                    MyListDrawer. When disabled, the price range section is completely hidden.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(!settings.showPriceRange)}
                    disabled={isSaving}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      "focus-ring",
                      settings.showPriceRange
                        ? "bg-primary-500"
                        : "bg-muted-foreground/30",
                      isSaving && "opacity-50 cursor-not-allowed"
                    )}
                    role="switch"
                    aria-checked={settings.showPriceRange}
                    aria-label="Toggle price range visibility"
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.showPriceRange ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                  {isSaving && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
