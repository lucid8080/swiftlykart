import Link from "next/link";
import { Home, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-background">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link
        href="/"
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
          "bg-primary-500 text-white",
          "hover:bg-primary-600 active:scale-95",
          "focus-ring transition-colors-fast"
        )}
      >
        <Home className="w-5 h-5" />
        Go to Home
      </Link>
    </div>
  );
}
