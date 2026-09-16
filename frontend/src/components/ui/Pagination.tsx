"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ListOrdered,
  Infinity as InfinityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  mode?: "pages" | "infinite";
  showModeToggle?: boolean;
  onModeChange?: (mode: "pages" | "infinite") => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  mode = "pages",
  showModeToggle = false,
  onModeChange,
  hasMore,
  isLoadingMore = false,
  onLoadMore,
  itemLabel = "items",
  className,
}: PaginationProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore =
    hasMore !== undefined ? hasMore : currentPage < totalPages;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && canLoadMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [canLoadMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    if (mode !== "infinite") return;
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "250px",
      threshold: 0.1,
    });

    observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [mode, handleObserver]);

  const renderModeToggle = () => {
    if (!showModeToggle || !onModeChange) return null;

    return (
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-500/10 border border-neutral-200/50 dark:border-white/5 select-none">
        <button
          type="button"
          onClick={() => onModeChange("pages")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all",
            mode === "pages"
              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Pages</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("infinite")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all",
            mode === "infinite"
              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          )}
        >
          <InfinityIcon className="w-3.5 h-3.5" />
          <span>Infinite</span>
        </button>
      </div>
    );
  };

  if (mode === "infinite") {
    return (
      <div
        className={cn(
          "pt-4 flex flex-col items-center justify-center space-y-3 border-t border-neutral-200/50 dark:border-white/5",
          className
        )}
      >
        <div className="w-full flex items-center justify-between gap-3 px-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {totalCount !== undefined ? (
              <span>
                Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{Math.min(totalCount, currentPage * (pageSize || 15))}</span> of{" "}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalCount}</span> {itemLabel}
              </span>
            ) : null}
          </div>
          {renderModeToggle()}
        </div>

        <div ref={sentinelRef} className="h-2 w-full pointer-events-none" />

        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 py-3">
            <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading more {itemLabel}...</span>
          </div>
        )}

        {!canLoadMore && totalPages > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 py-4 select-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>You&apos;ve caught up with all {totalCount ? `${totalCount} ` : ""}{itemLabel}.</span>
          </div>
        )}

        {canLoadMore && !isLoadingMore && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            className="rounded-2xl"
          >
            Load More {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}
          </Button>
        )}
      </div>
    );
  }

  if (totalPages <= 1 && !showModeToggle) return null;

  const generatePageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("ellipsis");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  const pages = generatePageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-200/50 dark:border-white/5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {totalCount !== undefined ? (
            <span>
              Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{Math.min(totalCount, (currentPage - 1) * (pageSize || 15) + 1)}</span>-
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{Math.min(totalCount, currentPage * (pageSize || 15))}</span> of{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalCount}</span> {itemLabel}
            </span>
          ) : (
            <span>
              Page <span className="font-semibold text-neutral-900 dark:text-neutral-100">{currentPage}</span> of{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalPages}</span>
            </span>
          )}
        </div>
        {renderModeToggle()}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <IconButton
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft />
          </IconButton>

          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-neutral-400 text-xs select-none"
                  >
                    ...
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange?.(p)}
                  className={cn(
                    "w-7 h-7 rounded-xl text-xs font-semibold transition-all select-none",
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/10"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <IconButton
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight />
          </IconButton>
        </div>
      )}
    </div>
  );
}
