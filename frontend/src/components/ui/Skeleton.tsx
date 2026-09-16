"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

export function Skeleton({
  className,
  rounded = "xl",
  ...props
}: SkeletonProps) {
  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn(
        "animate-pulse bg-neutral-200/70 dark:bg-neutral-800/70 select-none",
        roundedClasses,
        className
      )}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("p-4 space-y-3", className)}>
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-white/10">
        <Skeleton className="w-36 h-4" rounded="md" />
        <Skeleton className="w-20 h-4" rounded="md" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-white/5"
        >
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-10 h-3.5" rounded="sm" />
            <Skeleton className="w-36 h-3.5" rounded="md" />
            <Skeleton className="w-24 h-3.5" rounded="md" />
            <Skeleton className="w-16 h-3.5" rounded="md" />
          </div>
          <Skeleton className="w-16 h-6" rounded="lg" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-neutral-200/60 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-4" rounded="md" />
            <Skeleton className="w-14 h-5" rounded="full" />
          </div>
          <Skeleton className="w-full h-16" rounded="xl" />
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/5">
            <Skeleton className="w-20 h-3.5" rounded="sm" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6" rounded="md" />
              <Skeleton className="w-6 h-6" rounded="md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("p-6 rounded-3xl border border-neutral-200/60 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 space-y-5", className)}>
      <div className="space-y-1.5 pb-4 border-b border-neutral-200/50 dark:border-white/10">
        <Skeleton className="w-40 h-5" rounded="md" />
        <Skeleton className="w-64 h-3.5" rounded="sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-24 h-3.5" rounded="sm" />
            <Skeleton className="w-full h-10" rounded="xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t border-neutral-200/50 dark:border-white/10">
        <Skeleton className="w-28 h-9" rounded="xl" />
      </div>
    </div>
  );
}

export function ListSkeleton({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-neutral-200/60 dark:border-white/10 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-5 h-5" rounded="md" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-32 h-4" rounded="md" />
              <Skeleton className="w-48 h-3" rounded="sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7" rounded="lg" />
            <Skeleton className="w-7 h-7" rounded="lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
