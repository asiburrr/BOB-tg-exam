"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface QuestionCardSkeletonProps {
  count?: number;
  className?: string;
}

export function QuestionCardSkeleton({
  count = 1,
  className,
}: QuestionCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "glass-panel p-5 rounded-3xl space-y-4 border border-neutral-200/50 dark:border-white/5",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Skeleton className="w-4 h-4 rounded-sm mt-1 shrink-0" />
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md opacity-70" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {Array.from({ length: 4 }).map((_, optIdx) => (
              <div
                key={optIdx}
                className="p-3 rounded-2xl border border-neutral-200/40 dark:border-white/5 bg-white/20 dark:bg-neutral-800/20 flex items-center gap-2.5"
              >
                <Skeleton className="w-5 h-5 rounded-lg shrink-0" />
                <Skeleton className="h-3.5 w-4/5 rounded-md" />
              </div>
            ))}
          </div>

          <Skeleton className="h-10 rounded-2xl" />
        </div>
      ))}
    </>
  );
}
