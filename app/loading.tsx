import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
