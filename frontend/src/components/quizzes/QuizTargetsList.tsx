"use client";

import React, { useState } from "react";
import { Radio, Plus, Trash2, Edit3, CheckCircle2, XCircle, Hash, ExternalLink } from "lucide-react";
import { TelegramQuizTarget } from "@/lib/types";

interface QuizTargetsListProps {
  targets: TelegramQuizTarget[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (target: TelegramQuizTarget) => void;
  onDelete: (id: number) => Promise<void>;
  onToggleActive: (target: TelegramQuizTarget) => Promise<void>;
}

export function QuizTargetsList({
  targets,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: QuizTargetsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this target destination?")) {
      return;
    }
    try {
      setDeletingId(id);
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl p-4 rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-500" />
            <span>Target Destinations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              {targets.length} Configured
            </span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Telegram channels and groups authorized for scheduled quizzes & automated leaderboard posts
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Target</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-white/5" />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/40 dark:bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">No Target Destinations Yet</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            Add your Telegram channel or study group chat ID / handle first before assigning quizzes.
          </p>
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Target</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t) => (
            <div
              key={t.id}
              className="relative flex flex-col justify-between p-5 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-xl rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.chat_type === "channel"
                        ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                    }`}
                  >
                    {t.chat_type}
                  </span>
                  <button
                    onClick={() => onToggleActive(t)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                      t.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"
                    }`}
                  >
                    {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{t.is_active ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate mb-1">
                  {t.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  <Hash className="w-3 h-3 shrink-0" />
                  <span className="truncate">{t.chat_id}</span>
                </div>

                {t.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-[10px] text-neutral-400">
                  Added {new Date(t.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Edit Target"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    title="Delete Target"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
