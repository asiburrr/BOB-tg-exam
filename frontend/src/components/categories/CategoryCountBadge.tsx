"use client";

import React, { useMemo } from "react";
import { QuestionCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CategoryCountBadgeProps {
  node: QuestionCategory;
  showChain?: boolean;
  compact?: boolean;
  className?: string;
}

export function extractCountChain(node: QuestionCategory): number[] {
  const chain: number[] = [node.question_count || 0];
  let curr = node;

  while (curr.children && curr.children.length > 0) {
    const validChildren = curr.children.filter(
      (c) => (c.question_count || 0) > 0
    );
    if (validChildren.length === 0) break;

    const primaryChild = validChildren.reduce(
      (max, c) => ((c.question_count || 0) > (max.question_count || 0) ? c : max),
      validChildren[0]
    );

    chain.push(primaryChild.question_count || 0);
    curr = primaryChild;
  }

  return chain;
}

export function CategoryCountBadge({
  node,
  showChain = true,
  compact = false,
  className,
}: CategoryCountBadgeProps) {
  const isRoot = !node.parent_id;
  const total = node.question_count || 0;
  
  const direct = useMemo(() => {
    if (node.direct_count !== undefined) return node.direct_count;
    if (!node.children || node.children.length === 0) return total;
    const childSum = node.children.reduce(
      (acc, c) => acc + (c.question_count || 0),
      0
    );
    return Math.max(0, total - childSum);
  }, [node, total]);

  const leadingCount = isRoot ? total : direct;

  const chain = useMemo(() => {
    if (!showChain || !node.children || node.children.length === 0) return [];
    return extractCountChain(node);
  }, [node, showChain]);

  const hasSubcategoryChain = chain.length > 1;

  const titleText = isRoot
    ? `Root Category: ${total} total questions (${direct} direct, ${Math.max(0, total - direct)} in subcategories)${hasSubcategoryChain ? ` • Chain: ${chain.join(" > ")}` : ""}`
    : hasSubcategoryChain
    ? `Subcategory: ${direct} direct questions (${total} total with subtopics) • Chain: ${chain.join(" > ")}`
    : `${direct} questions in this topic`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 select-none font-mono",
        compact ? "text-[10px]" : "text-[11px]",
        className
      )}
      title={titleText}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border font-semibold",
          compact
            ? "px-1.5 py-0.2 bg-neutral-500/10 border-transparent text-neutral-700 dark:text-neutral-300"
            : "px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 border-neutral-200/60 dark:border-white/10 shadow-2xs"
        )}
      >
        <span className="font-bold">{leadingCount}</span>
        {hasSubcategoryChain && (
          <>
            <span className="text-neutral-400 font-sans font-normal text-[9px]">-</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">
              {chain.join(">")}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
