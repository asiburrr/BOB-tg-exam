"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Radio, AlertCircle, Clock, Send } from "lucide-react";
import { TelegramQuiz, TelegramQuizTarget } from "@/lib/types";

interface QuizAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: {
    quiz_id: number;
    target_id: number;
    start_time: string;
    end_time: string;
    announce_now: boolean;
  }) => Promise<void>;
  preselectedQuiz?: TelegramQuiz | null;
  quizzes: TelegramQuiz[];
  targets: TelegramQuizTarget[];
}

export function QuizAssignModal({
  isOpen,
  onClose,
  onAssign,
  preselectedQuiz,
  quizzes,
  targets,
}: QuizAssignModalProps) {
  const [mounted, setMounted] = useState(false);
  const [quizId, setQuizId] = useState<number | "">("");
  const [targetId, setTargetId] = useState<number | "">("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [announceNow, setAnnounceNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (preselectedQuiz) {
      setQuizId(preselectedQuiz.id);
    } else if (quizzes.length > 0) {
      setQuizId(quizzes[0].id);
    } else {
      setQuizId("");
    }

    if (targets.length > 0) {
      setTargetId(targets[0].id);
    } else {
      setTargetId("");
    }

    const getInitialBDString = (offsetMinutes: number = 0) => {
      const d = new Date(Date.now() + 6 * 3600 * 1000 + offsetMinutes * 60 * 1000);
      return d.toISOString().slice(0, 16);
    };

    setStartTime(getInitialBDString(5));
    setEndTime(getInitialBDString(65));
    setAnnounceNow(true);
    setError(null);
  }, [isOpen, preselectedQuiz, quizzes, targets]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId) {
      setError("Please select a quiz template to assign.");
      return;
    }
    if (!targetId) {
      setError("Please select a target channel or group.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please set both start time and end time.");
      return;
    }

    const startIso = new Date(`${startTime}:00+06:00`).toISOString();
    const endIso = new Date(`${endTime}:00+06:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setError("End time must be after start time.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAssign({
        quiz_id: Number(quizId),
        target_id: Number(targetId),
        start_time: startIso,
        end_time: endIso,
        announce_now: announceNow,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to schedule quiz assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Assign & Schedule Quiz
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Schedule live quiz polls and publish automatic leaderboard upon conclusion (BST, UTC+6)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Select Quiz *
            </label>
            <select
              value={quizId}
              onChange={(e) => setQuizId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
              required
            >
              <option value="" disabled>
                -- Choose a Quiz --
              </option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.total_questions} Questions)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Target Channel / Group *
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-medium"
              required
            >
              <option value="" disabled>
                -- Choose Destination --
              </option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.chat_type} • {t.chat_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Start Time (BST, UTC+6) *</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>End Time (BST, UTC+6) *</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/30">
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                  Broadcast Announcement Immediately
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Sends the start card with a direct link button to the channel/group right now
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={announceNow}
              onChange={(e) => setAnnounceNow(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !quizId || !targetId}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? "Scheduling..." : "Schedule Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
