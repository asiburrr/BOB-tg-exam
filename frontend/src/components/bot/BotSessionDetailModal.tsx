"use client";

import React, { useState, useEffect } from "react";
import { Check, X, Info, CheckCircle2, XCircle } from "lucide-react";
import { ExamSession } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface BotSessionDetailModalProps {
  session: ExamSession | null;
  onClose: () => void;
}

export function BotSessionDetailModal({
  session,
  onClose,
}: BotSessionDetailModalProps) {
  const [detail, setDetail] = useState<ExamSession | null>(session);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.id) {
      setDetail(null);
      return;
    }
    setDetail(session);
    if (!session.answers || session.answers.length === 0) {
      setLoading(true);
      api
        .get(`/telegram/sessions/${session.id}`)
        .then((res: any) => {
          if (res?.data) {
            setDetail(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, [session]);

  if (!session) return null;

  const current = detail || session;

  return (
    <Modal
      isOpen={Boolean(session)}
      onClose={onClose}
      title={`Scorecard • Session #${current.id}`}
      description={`Candidate: ${current.user_name || `User #${current.user_id}`} • Category: ${current.category_name || "General Test Bank"}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/60 dark:border-white/5">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">Score</span>
            <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
              {current.score} / {current.max_score}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">Accuracy</span>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {current.accuracy_percentage}%
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">Correct / Wrong</span>
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-mono flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {current.correct_count}
              </span>
              <span>/</span>
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                <XCircle className="w-3 h-3" />
                {current.wrong_count}
              </span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">Status</span>
            <div className="mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                current.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : current.status === "in_progress"
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                {current.status?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span className="text-xs text-neutral-400">Loading detailed question scorecard...</span>
          </div>
        ) : current.answers && current.answers.length > 0 ? (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {current.answers.map((ans, idx) => (
              <div
                key={ans.id || idx}
                className={`p-3.5 rounded-2xl border transition-colors ${
                  ans.is_correct
                    ? "bg-emerald-500/[0.04] border-emerald-500/20"
                    : "bg-rose-500/[0.04] border-rose-500/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs leading-snug">
                    {idx + 1}. {ans.question_text || "Question Prompt"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                      ans.is_correct
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {ans.is_correct ? (
                      <>
                        <Check className="w-3 h-3" />
                        +{ans.points_awarded}
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        {ans.points_awarded}
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 text-[11px]">
                  <div className="p-2.5 bg-white/60 dark:bg-white/[0.02] rounded-xl border border-neutral-200/50 dark:border-white/5">
                    <span className="text-neutral-400 block text-[10px] mb-0.5">
                      Candidate Choice
                    </span>
                    <span
                      className={
                        ans.is_correct
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-rose-600 dark:text-rose-400 font-medium"
                      }
                    >
                      {ans.selected_option_text || ans.selected_text || "Skipped / Unanswered"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white/60 dark:bg-white/[0.02] rounded-xl border border-neutral-200/50 dark:border-white/5">
                    <span className="text-neutral-400 block text-[10px] mb-0.5">
                      Correct Choice
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {ans.correct_option_text || ans.correct_text || "Correct Choice"}
                    </span>
                  </div>
                </div>

                {ans.explanation && (
                  <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-500/5 dark:bg-white/[0.02] p-2.5 rounded-xl border border-neutral-200/40 dark:border-white/5 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                    <span>{ans.explanation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 dark:text-neutral-500">
            No answers recorded for this exam session.
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-neutral-200/60 dark:border-white/5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close Scorecard
          </Button>
        </div>
      </div>
    </Modal>
  );
}
