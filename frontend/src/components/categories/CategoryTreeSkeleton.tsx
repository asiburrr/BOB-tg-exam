"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface CategoryTreeSkeletonProps {
  count?: number;
  compact?: boolean;
  className?: string;
}

export function CategoryTreeSkeleton({
  count = 4,
  compact = false,
  className,
}: CategoryTreeSkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <div className={cn("space-y-2 py-1", className)}>
      {items.map((_, i) => {
        const isChild = i % 2 === 1;
        const indent = isChild && !compact ? "ml-4 md:ml-6" : "";

        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between py-2 px-3 rounded-2xl border border-neutral-200/40 dark:border-white/5 bg-white/30 dark:bg-neutral-800/30 animate-pulse",
              indent,
              compact ? "py-1.5 px-2" : ""
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
              <Skeleton className="w-6 h-6 rounded-xl shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <Skeleton
                  className={cn(
                    "h-3.5 rounded-md",
                    i % 3 === 0 ? "w-36" : i % 2 === 0 ? "w-28" : "w-48"
                  )}
                />
                {!compact && (
                  <Skeleton className="h-2.5 w-24 rounded-md opacity-60" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Skeleton className="w-8 h-4 rounded-full" />
              {!compact && (
                <>
                  <Skeleton className="w-6 h-6 rounded-xl" />
                  <Skeleton className="w-6 h-6 rounded-xl" />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
