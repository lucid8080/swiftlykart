"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft,
  User,
  KeyRound,
  Smartphone,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Trash2,
  Share2,
  Navigation,
  Phone,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeviceHeaders, getClientDeviceId } from "@/lib/device-client";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [currentPin, setCurrentPin] = useState<string | null>(null); // Store PIN when set for sharing

  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [sharePin, setSharePin] = useState(""); // PIN input for sharing
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  // NFC Landing Preference state
  const [nfcLandingMode, setNfcLandingMode] = useState<"home" | "list" | "custom">("list");
  const [nfcLandingPath, setNfcLandingPath] = useState("");
  const [nfcPrefLoading, setNfcPrefLoading] = useState(false);
  const [nfcPrefSaved, setNfcPrefSaved] = useState(false);
  const [nfcPrefError, setNfcPrefError] = useState<string | null>(null);

  // Profile/Contact Info state
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("CA");

  useEffect(() => {
    setDeviceId(getClientDeviceId());
    // Check if Web Share API is supported
    setShareSupported(typeof navigator !== "undefined" && "share" in navigator);
    // Check if PIN exists
    checkPinExists();
    // Load NFC landing preference
    fetchNfcPreference();
    // Load profile/contact info
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/account/profile");
      const data = await res.json();
      if (data.success && data.data) {
        setFirstName(data.data.firstName || "");
        setLastName(data.data.lastName || "");
        setPhone(data.data.phone || "");
        setAddress1(data.data.address1 || "");
        setAddress2(data.data.address2 || "");
        setCity(data.data.city || "");
        setRegion(data.data.region || "");
        setPostalCode(data.data.postalCode || "");
        setCountry(data.data.country || "CA");
      }
    } catch {
      // Silently fail — defaults are fine
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          address1,
          address2,
          city,
          region,
          postalCode,
          country,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        setProfileError(data.error || "Failed to save profile");
      }
    } catch {
      setProfileError("Failed to save profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchNfcPreference = async () => {
    try {
      const res = await fetch("/api/account/preferences");
      const data = await res.json();
      if (data.success && data.data) {
        setNfcLandingMode(data.data.nfcLandingMode || "list");
        if (data.data.nfcLandingMode === "custom" && data.data.nfcLandingPath) {
          setNfcLandingPath(data.data.nfcLandingPath);
        }
      }
    } catch {
      // Silently fail — default is fine
    }
  };

  const handleSaveNfcPreference = async () => {
    setNfcPrefLoading(true);
    setNfcPrefError(null);
    setNfcPrefSaved(false);

    try {
      const payload: { nfcLandingMode: string; nfcLandingPath?: string | null } = {
        nfcLandingMode,
      };
      if (nfcLandingMode === "custom") {
        payload.nfcLandingPath = nfcLandingPath || null;
      }

      const res = await fetch("/api/account/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setNfcPrefSaved(true);
        setTimeout(() => setNfcPrefSaved(false), 3000);
      } else {
        setNfcPrefError(data.error || "Failed to save preference");
      }
    } catch {
      setNfcPrefError("Failed to save preference");
    } finally {
      setNfcPrefLoading(false);
    }
  };

  const checkPinExists = async () => {
    try {
      const response = await fetch("/api/account/pin", {
        method: "GET",
        headers: getDeviceHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setHasPin(data.data.hasPin);
      }
    } catch {
      // Silently fail
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) return;

    setPinLoading(true);
    setPinError(null);
    setPinSuccess(false);

    try {
      const response = await fetch("/api/account/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (data.success) {
        setPinSuccess(true);
        setHasPin(true);
        setCurrentPin(pin); // Store PIN for immediate sharing
        setPin("");
      } else {
        setPinError(data.error || "Failed to set PIN");
      }
    } catch {
      setPinError("Failed to set PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!confirm("Remove PIN access from your list?")) return;

    setPinLoading(true);
    setPinError(null);

    try {
      const response = await fetch("/api/account/pin", {
        method: "DELETE",
        headers: getDeviceHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setHasPin(false);
        setPinSuccess(false);
        setCurrentPin(null); // Clear stored PIN
        setSharePin(""); // Clear share PIN input
      } else {
        setPinError(data.error || "Failed to remove PIN");
      }
    } catch {
      setPinError("Failed to remove PIN");
    } finally {
      setPinLoading(false);
    }
  };

  const handleLinkDevice = async () => {
    setLinkLoading(true);

    try {
      const response = await fetch("/api/device/link", {
        method: "POST",
        headers: getDeviceHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        setLinkSuccess(true);
      }
    } catch {
      // Silently fail
    } finally {
      setLinkLoading(false);
    }
  };

  const copyDeviceId = () => {
    if (deviceId) {
      navigator.clipboard.writeText(deviceId);
    }
  };

  const getShareUrl = (pinValue: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/?pin=${pinValue}`;
  };

  const copyShareLink = async (pinValue: string) => {
    const url = getShareUrl(pinValue);
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleWebShare = async (pinValue: string) => {
    if (!shareSupported) return;

    const url = getShareUrl(pinValue);
    try {
      await navigator.share({
        title: "My Grocery List",
        text: "Check out my grocery list!",
        url: url,
      });
    } catch (error: unknown) {
      // User cancelled or error occurred
      const err = error as { name?: string };
      if (err.name !== "AbortError") {
        console.error("Error sharing:", error);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className={cn(
              "p-2 -ml-2 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted focus-ring"
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Account</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User info */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <User className="w-7 h-7 text-primary-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">
                {session.user.name || "User"}
              </h2>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </section>

        {/* Profile / Contact Info */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Profile / Contact Info</h3>
              <p className="text-sm text-muted-foreground">
                Optional — helps us offer local promotions
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Name fields - 2 columns on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-firstName" className="sr-only">
                  First name
                </label>
                <input
                  id="profile-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
              <div>
                <label htmlFor="profile-lastName" className="sr-only">
                  Last name
                </label>
                <input
                  id="profile-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="profile-phone" className="sr-only">
                Phone
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
                  placeholder="Phone"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
            </div>

            {/* Address fields - 2 columns on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-address1" className="sr-only">
                  Address line 1
                </label>
                <input
                  id="profile-address1"
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Address line 1"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
              <div>
                <label htmlFor="profile-address2" className="sr-only">
                  Address line 2
                </label>
                <input
                  id="profile-address2"
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Address line 2"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
            </div>

            {/* City, Region, Postal - 3 columns on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="profile-city" className="sr-only">
                  City
                </label>
                <input
                  id="profile-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
              <div>
                <label htmlFor="profile-region" className="sr-only">
                  Province/State
                </label>
                <input
                  id="profile-region"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Province/State"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
              <div>
                <label htmlFor="profile-postalCode" className="sr-only">
                  Postal/Zip
                </label>
                <input
                  id="profile-postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal/Zip"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-sm"
                  )}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="profile-country" className="sr-only">
                Country
              </label>
              <input
                id="profile-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                maxLength={3}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring transition-colors-fast",
                  "text-sm"
                )}
              />
            </div>

            {profileError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSaved && (
              <div className="flex items-center gap-2 text-accent-600 dark:text-accent-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Profile saved!</span>
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={profileLoading}
              className={cn(
                "w-full py-2.5 rounded-xl font-medium",
                "bg-primary-500 text-white",
                "hover:bg-primary-600 disabled:opacity-50",
                "focus-ring transition-colors-fast",
                "flex items-center justify-center gap-2"
              )}
            >
              {profileLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </section>

        {/* PIN settings */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">PIN Access</h3>
              <p className="text-sm text-muted-foreground">
                Share your list via NFC tag
              </p>
            </div>
          </div>

          <form onSubmit={handleSetPin} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit PIN"
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring transition-colors-fast"
                )}
              />
              <button
                type="submit"
                disabled={pin.length !== 4 || pinLoading}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-medium",
                  "bg-primary-500 text-white",
                  "hover:bg-primary-600 disabled:opacity-50",
                  "focus-ring transition-colors-fast"
                )}
              >
                {pinLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Set PIN"
                )}
              </button>
            </div>

            {pinError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="flex items-center gap-2 text-accent-600 dark:text-accent-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>PIN set successfully!</span>
              </div>
            )}
          </form>

          {hasPin && (
            <button
              onClick={handleRemovePin}
              className={cn(
                "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg",
                "text-sm text-red-600 dark:text-red-400",
                "hover:bg-red-50 dark:hover:bg-red-950/30",
                "focus-ring transition-colors-fast"
              )}
            >
              <Trash2 className="w-4 h-4" />
              Remove PIN
            </button>
          )}

          <div className="mt-4 p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">📱 NFC Tag Setup</p>
            <p>
              Write this URL to your NFC tag:
              <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                https://yourdomain.com/?pin=YOUR_PIN
              </code>
            </p>
          </div>
        </section>

        {/* Share List */}
        {hasPin && (
          <section className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Share List</h3>
                <p className="text-sm text-muted-foreground">
                  Share your shopping list with others
                </p>
              </div>
            </div>

            {/* Show share link if PIN is known (just set) */}
            {currentPin && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <code className="flex-1 text-xs break-all">
                    {getShareUrl(currentPin)}
                  </code>
                  <button
                    onClick={() => copyShareLink(currentPin)}
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-muted focus-ring transition-colors-fast"
                    )}
                    aria-label="Copy share link"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4 text-accent-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyShareLink(currentPin)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl font-medium",
                      "bg-muted text-foreground",
                      "hover:bg-muted/80",
                      "focus-ring transition-colors-fast",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  {shareSupported && (
                    <button
                      onClick={() => handleWebShare(currentPin)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl font-medium",
                        "bg-primary-500 text-white",
                        "hover:bg-primary-600",
                        "focus-ring transition-colors-fast",
                        "flex items-center justify-center gap-2"
                      )}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Show PIN input if PIN exists but not known (for later sharing) */}
            {!currentPin && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter your PIN to generate a shareable link:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={sharePin}
                    onChange={(e) => setSharePin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter your PIN"
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl",
                      "bg-muted border-2 border-transparent",
                      "focus:border-primary-500 focus:bg-card",
                      "focus-ring transition-colors-fast"
                    )}
                  />
                  <button
                    onClick={() => {
                      if (sharePin.length >= 4) {
                        setCurrentPin(sharePin);
                        setSharePin("");
                      }
                    }}
                    disabled={sharePin.length < 4}
                    className={cn(
                      "px-4 py-2.5 rounded-xl font-medium",
                      "bg-primary-500 text-white",
                      "hover:bg-primary-600 disabled:opacity-50",
                      "focus-ring transition-colors-fast"
                    )}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* NFC Landing Preference */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">NFC Landing</h3>
              <p className="text-sm text-muted-foreground">
                Where to go when you tap your NFC tag
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Radio: Home */}
            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer",
                "border-2 transition-colors",
                nfcLandingMode === "home"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                  : "border-transparent bg-muted/50 hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="nfcLanding"
                value="home"
                checked={nfcLandingMode === "home"}
                onChange={() => setNfcLandingMode("home")}
                className="accent-primary-500"
              />
              <div>
                <p className="font-medium text-sm">Home</p>
                <p className="text-xs text-muted-foreground">Opens the main page ( / )</p>
              </div>
            </label>

            {/* Radio: My List */}
            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer",
                "border-2 transition-colors",
                nfcLandingMode === "list"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                  : "border-transparent bg-muted/50 hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="nfcLanding"
                value="list"
                checked={nfcLandingMode === "list"}
                onChange={() => setNfcLandingMode("list")}
                className="accent-primary-500"
              />
              <div>
                <p className="font-medium text-sm">My List</p>
                <p className="text-xs text-muted-foreground">Opens your shopping list ( /list )</p>
              </div>
            </label>

            {/* Radio: Custom */}
            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer",
                "border-2 transition-colors",
                nfcLandingMode === "custom"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                  : "border-transparent bg-muted/50 hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="nfcLanding"
                value="custom"
                checked={nfcLandingMode === "custom"}
                onChange={() => setNfcLandingMode("custom")}
                className="accent-primary-500"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">Custom Path</p>
                <p className="text-xs text-muted-foreground">Enter a custom page path</p>
              </div>
            </label>

            {nfcLandingMode === "custom" && (
              <input
                type="text"
                value={nfcLandingPath}
                onChange={(e) => setNfcLandingPath(e.target.value)}
                placeholder="/my-custom-page"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring transition-colors-fast text-sm"
                )}
              />
            )}

            {nfcPrefError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{nfcPrefError}</span>
              </div>
            )}

            {nfcPrefSaved && (
              <div className="flex items-center gap-2 text-accent-600 dark:text-accent-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Preference saved!</span>
              </div>
            )}

            <button
              onClick={handleSaveNfcPreference}
              disabled={nfcPrefLoading}
              className={cn(
                "w-full py-2.5 rounded-xl font-medium",
                "bg-primary-500 text-white",
                "hover:bg-primary-600 disabled:opacity-50",
                "focus-ring transition-colors-fast",
                "flex items-center justify-center gap-2"
              )}
            >
              {nfcPrefLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Preference"
              )}
            </button>
          </div>
        </section>

        {/* Device linking */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">This Device</h3>
              <p className="text-sm text-muted-foreground">
                Link device to your account
              </p>
            </div>
          </div>

          {deviceId && (
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg truncate">
                {deviceId}
              </code>
              <button
                onClick={copyDeviceId}
                className={cn(
                  "p-2 rounded-lg",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted focus-ring"
                )}
                aria-label="Copy device ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleLinkDevice}
            disabled={linkLoading || linkSuccess}
            className={cn(
              "w-full py-2.5 rounded-xl font-medium",
              "bg-muted text-foreground",
              "hover:bg-muted/80 disabled:opacity-50",
              "focus-ring transition-colors-fast",
              "flex items-center justify-center gap-2"
            )}
          >
            {linkLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : linkSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 text-accent-500" />
                <span>Device linked</span>
              </>
            ) : (
              <span>Link this device</span>
            )}
          </button>
        </section>

        {/* Sign out */}
        <section className="bg-card rounded-2xl p-4 border border-border">
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full py-3 rounded-xl font-medium",
              "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
              "hover:bg-red-100 dark:hover:bg-red-950/50",
              "focus-ring transition-colors-fast",
              "flex items-center justify-center gap-2"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </section>

        {/* Admin link */}
        {session.user.role === "admin" && (
          <section className="text-center">
            <Link
              href="/admin/items"
              className={cn(
                "inline-block px-4 py-2 rounded-lg",
                "text-primary-500 font-medium",
                "hover:bg-primary-50 dark:hover:bg-primary-950/30",
                "focus-ring transition-colors-fast"
              )}
            >
              Go to Admin Panel →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
