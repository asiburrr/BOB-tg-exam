"use client";

import React, { useState } from "react";
import { BookOpen, Plus, AlertTriangle, CalendarPlus, Edit3, Trash2, HelpCircle } from "lucide-react";
import { TelegramQuiz } from "@/lib/types";

interface QuizListProps {
  quizzes: TelegramQuiz[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (quiz: TelegramQuiz) => void;
  onDelete: (id: number) => Promise<void>;
  onAssign: (quiz: TelegramQuiz) => void;
}

export function QuizList({
  quizzes,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onAssign,
}: QuizListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this quiz template?")) {
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
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Designed Quizzes</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              {quizzes.length} Templates
            </span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Curated question sets ready to be scheduled and broadcasted to Telegram channels or groups
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Design New Quiz</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-white/5" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/40 dark:bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">No Quizzes Designed Yet</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            Create your first quiz template by selecting questions from the Question Bank.
          </p>
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Design Quiz Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="relative flex flex-col justify-between p-5 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-xl rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                    <HelpCircle className="w-3 h-3" />
                    <span>{q.total_questions} Questions</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    ID #{q.id}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
                  {q.title}
                </h3>

                {q.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
                    {q.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Live Poll Quiz</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />
                    <span>-{q.negative_marking_rate} wrong</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  onClick={() => onAssign(q)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors active:scale-95"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Assign & Schedule</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(q)}
                    className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Edit Quiz"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    title="Delete Quiz"
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
