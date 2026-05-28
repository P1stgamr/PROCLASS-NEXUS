import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 rounded-2xl flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3 bg-white/10 rounded-full" />
        <Skeleton className="h-3 w-1/2 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}
