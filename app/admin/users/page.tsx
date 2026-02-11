"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  X,
  Shield,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  List as ListIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ListItemData {
  id: string;
  groceryItemId: string;
  name: string;
  icon: string | null;
  variantName: string | null;
  storeName: string | null;
  price: number | null;
}

interface MyListItemData {
  id: string;
  itemKey: string;
  itemLabel: string;
  quantity: number | null;
  timesPurchased: number;
  purchased: boolean;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    lists: number;
    devices: number;
    sessions: number;
    identityClaims: number;
  };
  visitor: {
    id: string;
    anonVisitorId: string;
    tapCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  nfcTags: Array<{
    id: string;
    publicUuid: string;
    label: string | null;
    status: string;
    batch: {
      slug: string;
      name: string;
    };
    tapCount: number;
  }>;
  listItems: ListItemData[];
  myListItems: MyListItemData[];
}

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else setError(data.error);
    } catch {
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/items"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              <h1 className="text-lg font-semibold">Registered Users</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-sm font-medium">Visitor UUID</th>
                  <th className="px-4 py-3 text-sm font-medium">NFC Tags</th>
                  <th className="px-4 py-3 text-sm font-medium text-right">List Items</th>
                  <th className="px-4 py-3 text-sm font-medium text-right">Devices</th>
                  <th className="px-4 py-3 text-sm font-medium text-right">Sessions</th>
                  <th className="px-4 py-3 text-sm font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const isExpanded = expandedUsers.has(user.id);
                  const totalItems = user.listItems.length + user.myListItems.length;

                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || "User"}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{user.name || "No name"}</div>
                              {user.emailVerified && (
                                <div className="text-xs text-muted-foreground">Verified</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{user.email || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              user.role === "admin"
                                ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {user.role === "admin" && <Shield className="w-3 h-3" />}
                            {user.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.visitor ? (
                            <div className="space-y-1">
                              <div className="text-xs font-mono text-muted-foreground">
                                {user.visitor.anonVisitorId}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.visitor.tapCount} tap{user.visitor.tapCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {user.nfcTags.length > 0 ? (
                            <div className="space-y-1 max-w-xs">
                              <div className="text-xs font-medium">
                                {user.nfcTags.length} tag{user.nfcTags.length !== 1 ? "s" : ""}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {user.nfcTags.slice(0, 3).map((tag) => (
                                  <Link
                                    key={tag.id}
                                    href={`/admin/nfc/tags/${tag.publicUuid}`}
                                    className="text-xs px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors"
                                    title={`${tag.batch.name} - ${tag.tapCount} tap${tag.tapCount !== 1 ? "s" : ""}`}
                                  >
                                    {tag.label || tag.publicUuid.slice(0, 8)}
                                  </Link>
                                ))}
                                {user.nfcTags.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{user.nfcTags.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {totalItems > 0 ? (
                            <button
                              onClick={() => toggleExpand(user.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              {totalItems} item{totalItems !== 1 ? "s" : ""}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{user._count.devices}</td>
                        <td className="px-4 py-3 text-right">{user._count.sessions}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>

                      {/* Expanded list items row */}
                      {isExpanded && totalItems > 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="space-y-3 max-w-2xl">
                              {/* Grocery List items (List model) */}
                              {user.listItems.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Grocery List ({user.listItems.length} item{user.listItems.length !== 1 ? "s" : ""})
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {user.listItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50 text-sm"
                                      >
                                        {item.icon && (
                                          <span className="text-base flex-shrink-0">{item.icon}</span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium truncate">{item.name}</div>
                                          {(item.variantName || item.storeName) && (
                                            <div className="text-xs text-muted-foreground truncate">
                                              {item.variantName}
                                              {item.storeName && (
                                                <span className="text-muted-foreground/70"> · {item.storeName}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {item.price != null && (
                                          <span className="text-xs font-medium text-green-600 dark:text-green-400 flex-shrink-0">
                                            ${item.price.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* My List items (MyList model - NFC visitor list) */}
                              {user.myListItems.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ListIcon className="w-3.5 h-3.5" />
                                    My List ({user.myListItems.length} item{user.myListItems.length !== 1 ? "s" : ""})
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {user.myListItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className={cn(
                                          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50 text-sm",
                                          item.purchased && "opacity-50"
                                        )}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className={cn("font-medium truncate", item.purchased && "line-through")}>
                                            {item.itemLabel}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.quantity && item.quantity > 1 && `Qty: ${item.quantity} · `}
                                            {item.timesPurchased > 0 && `Bought ${item.timesPurchased}x`}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {users.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Total: {users.length} user{users.length !== 1 ? "s" : ""}
          </div>
        )}
      </main>
    </div>
  );
}
