"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type DifficultyLevel = "easy" | "medium" | "hard" | "expert" | string;

export interface DifficultyBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  difficulty: DifficultyLevel;
  size?: "sm" | "md";
}

export function DifficultyBadge({
  difficulty,
  size = "sm",
  className,
  ...props
}: DifficultyBadgeProps) {
  const norm = (difficulty || "").toLowerCase();

  const colorStyles: Record<string, string> = {
    easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    expert: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };

  const currentColors =
    colorStyles[norm] ||
    "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold uppercase tracking-wider border rounded-full select-none transition-colors",
        sizeStyles,
        currentColors,
        className
      )}
      {...props}
    >
      {difficulty}
    </span>
  );
}
