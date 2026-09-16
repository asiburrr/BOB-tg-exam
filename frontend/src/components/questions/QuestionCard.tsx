"use client";

import React from "react";
import { QuestionItem } from "@/lib/types";
import { DifficultyBadge } from "./DifficultyBadge";
import { IconButton } from "@/components/ui/IconButton";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Folder,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionCardProps {
  question: QuestionItem;
  index?: number;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (question: QuestionItem) => void;
  onDelete?: (question: QuestionItem) => void;
  editHref?: string;
  extraActions?: React.ReactNode;
  className?: string;
}

export function QuestionCard({
  question,
  index,
  isSelected = false,
  onToggleSelect,
  showCheckbox = true,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  editHref,
  extraActions,
  className,
}: QuestionCardProps) {
  return (
    <div
      className={cn(
        "glass-panel p-5 rounded-3xl space-y-4 transition-all group border",
        isSelected
          ? "border-indigo-500/60 dark:border-indigo-400/60 bg-indigo-500/5 shadow-md"
          : "hover:border-neutral-300 dark:hover:border-white/15",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {showCheckbox && (
            <div className="mt-0.5 shrink-0">
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect?.(question.id)}
              />
            </div>
          )}

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {typeof index === "number" && (
                <span className="text-xs font-mono font-bold text-neutral-400">
                  #{index}
                </span>
              )}

              <DifficultyBadge difficulty={question.difficulty} />

              {question.category_hierarchy &&
              question.category_hierarchy.length > 0 ? (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-500/10 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  <Folder className="w-3 h-3 text-neutral-400 shrink-0" />
                  {question.category_hierarchy.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <ChevronRight className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                      )}
                      <span
                        className={
                          idx === question.category_hierarchy!.length - 1
                            ? "font-semibold text-neutral-900 dark:text-neutral-100"
                            : ""
                        }
                      >
                        {crumb}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              ) : question.category_name ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 font-medium">
                  {question.category_name}
                </span>
              ) : null}
            </div>

            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug whitespace-pre-wrap">
              {question.question}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {extraActions}

          {canEdit && (
            <IconButton
              href={editHref || `/admin/questions/${question.id}/edit`}
              onClick={onEdit ? () => onEdit(question) : undefined}
              variant="ghost"
              size="md"
              title="Edit Question"
              aria-label="Edit Question"
            >
              <Edit2 />
            </IconButton>
          )}

          {canDelete && (
            <IconButton
              onClick={() => onDelete?.(question)}
              variant="danger"
              size="md"
              title="Delete Question"
              aria-label="Delete Question"
            >
              <Trash2 />
            </IconButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {question.options?.map((opt, optIdx) => {
          const optLetter = String.fromCharCode(65 + optIdx);
          return (
            <div
              key={opt.id || optIdx}
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border transition-all ${
                opt.is_correct
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-white/40 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-white/5 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                  opt.is_correct
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {optLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{opt.option_text}</div>
                {opt.explanation && (
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {opt.explanation}
                  </div>
                )}
              </div>
              {opt.is_correct && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {question.explanation && (
        <div className="p-3 rounded-2xl bg-neutral-500/5 border border-neutral-200/50 dark:border-white/5 text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 mr-1">
              Explanation:
            </span>
            {question.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
