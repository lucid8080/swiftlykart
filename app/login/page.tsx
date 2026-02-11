"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LogIn, Mail, Lock, Loader2, AlertCircle, ArrowLeft, UserPlus, ChevronDown, ChevronUp, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { claimIdentity, getAnonVisitorId } from "@/lib/identity-client";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Optional contact info fields
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("CA");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else {
          // Claim identity after successful login
          const vid = getAnonVisitorId();
          try {
            if (vid) {
              await claimIdentity(vid, "login");
            }
          } catch (err) {
            console.warn("[Login] Identity claim failed:", err);
            // Don't block login if claim fails - prompt will show
          }
          router.push("/");
          router.refresh();
        }
      } else {
        // Register
        const payload: any = { email, password };
        if (name) payload.name = name;
        // Only include contact fields if they have values
        if (firstName) payload.firstName = firstName;
        if (lastName) payload.lastName = lastName;
        if (phone) payload.phone = phone;
        if (address1) payload.address1 = address1;
        if (address2) payload.address2 = address2;
        if (city) payload.city = city;
        if (region) payload.region = region;
        if (postalCode) payload.postalCode = postalCode;
        if (country) payload.country = country;
        
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          // Auto login after registration
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (!result?.error) {
            // Claim identity after successful registration/login
            const vid = getAnonVisitorId();
            try {
              if (vid) {
                await claimIdentity(vid, "signup");
              }
            } catch (err) {
              console.warn("[Register] Identity claim failed:", err);
              // Don't block registration if claim fails - prompt will show
            }
            router.push("/");
            router.refresh();
          }
        } else {
          setError(data.error || "Registration failed");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 text-muted-foreground",
            "hover:text-foreground focus-ring rounded-lg p-1 -m-1"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img
              src="/logo/swiftlykart-logo2.png"
              alt="SwiftlyKart"
              className="h-16 w-auto"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl tracking-tight text-foreground">
                SwiftlyKart
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin
                ? "Sign in to access your grocery lists"
                : "Sign up to save your grocery lists"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required={!isLogin}
                    className={cn(
                      "w-full pl-4 pr-4 py-3",
                      "bg-muted rounded-xl border-2 border-transparent",
                      "focus:border-primary-500 focus:bg-card",
                      "focus-ring transition-colors-fast",
                      "text-base"
                    )}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className={cn(
                    "w-full pl-10 pr-4 py-3",
                    "bg-muted rounded-xl border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-base"
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className={cn(
                    "w-full pl-10 pr-4 py-3",
                    "bg-muted rounded-xl border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring transition-colors-fast",
                    "text-base"
                  )}
                />
              </div>
            </div>

            {/* Contact Info (Optional) - Collapsible */}
            {!isLogin && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl",
                    "bg-muted/50 hover:bg-muted",
                    "focus-ring transition-colors-fast"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Contact info (optional)
                    </span>
                  </div>
                  {showContactInfo ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {showContactInfo && (
                  <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                      Optional — helps us offer local promotions. You can skip.
                    </p>
                    
                    {/* Name fields - 2 columns on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="sr-only">
                          First name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="sr-only">
                          Last name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="sr-only">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
                          placeholder="Phone"
                          className={cn(
                            "w-full pl-10 pr-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
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
                        <label htmlFor="address1" className="sr-only">
                          Address line 1
                        </label>
                        <input
                          id="address1"
                          type="text"
                          value={address1}
                          onChange={(e) => setAddress1(e.target.value)}
                          placeholder="Address line 1"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="address2" className="sr-only">
                          Address line 2
                        </label>
                        <input
                          id="address2"
                          type="text"
                          value={address2}
                          onChange={(e) => setAddress2(e.target.value)}
                          placeholder="Address line 2"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
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
                        <label htmlFor="city" className="sr-only">
                          City
                        </label>
                        <input
                          id="city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="region" className="sr-only">
                          Province/State
                        </label>
                        <input
                          id="region"
                          type="text"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="Province/State"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor="postalCode" className="sr-only">
                          Postal/Zip
                        </label>
                        <input
                          id="postalCode"
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Postal/Zip"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-background border-2 border-transparent",
                            "focus:border-primary-500 focus:bg-card",
                            "focus-ring transition-colors-fast",
                            "text-sm"
                          )}
                        />
                      </div>
                    </div>

                    {/* Country */}
                    <div>
                      <label htmlFor="country" className="sr-only">
                        Country
                      </label>
                      <input
                        id="country"
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Country"
                        maxLength={3}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-xl",
                          "bg-background border-2 border-transparent",
                          "focus:border-primary-500 focus:bg-card",
                          "focus-ring transition-colors-fast",
                          "text-sm"
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-3 rounded-xl font-medium",
                "bg-primary-500 text-white",
                "hover:bg-primary-600 active:scale-[0.98]",
                "focus-ring transition-colors-fast",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <span>{isLogin ? "Sign in" : "Create account"}</span>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center">
            <button
              onClick={toggleMode}
              className={cn(
                "text-primary-500 font-medium",
                "hover:underline focus-ring rounded"
              )}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          {/* PIN option */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Have a PIN instead?
            </p>
            <Link
              href="/pin"
              className={cn(
                "inline-block px-4 py-2 rounded-lg",
                "bg-muted text-foreground font-medium",
                "hover:bg-muted/80 focus-ring transition-colors-fast"
              )}
            >
              Enter PIN
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
