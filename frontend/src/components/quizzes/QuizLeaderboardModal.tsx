"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trophy, Users, Clock, Award, CheckCircle2, User, RefreshCw } from "lucide-react";
import { TelegramQuizLeaderboard } from "@/lib/types";
import { api } from "@/lib/api";

interface QuizLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number | null;
}

function formatBDTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d) + " (BST)";
  } catch {
    return dateStr;
  }
}

export function QuizLeaderboardModal({
  isOpen,
  onClose,
  assignmentId,
}: QuizLeaderboardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<TelegramQuizLeaderboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLeaderboard = async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<any>(`/telegram/quiz-assignments/${assignmentId}/leaderboard`);
      setData(res?.data || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assignmentId) {
      fetchLeaderboard();
    } else {
      setData(null);
    }
  }, [isOpen, assignmentId]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Official Quiz Leaderboard</span>
              </h2>
              {data && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {data.quiz_title} • {data.target_title}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
              {error}
            </div>
          )}

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block">
                  Total Completed
                </span>
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                  {data.total_participants}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block">
                  Status
                </span>
                <span
                  className={`text-xs font-bold uppercase inline-block mt-1 ${
                    data.status === "completed"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-semibold block">
                  Published to Channel
                </span>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mt-1">
                  {data.leaderboard_published_at
                    ? formatBDTime(data.leaderboard_published_at)
                    : "Pending End Time"}
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Loading rankings...
            </div>
          ) : !data || data.leaderboard.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No finished quiz attempts recorded yet.</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Candidate ranks are calculated automatically from Telegram poll answers with accurate second-level time tracking.
              </p>
            </div>
          ) : (
            <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {data.leaderboard.map((entry) => {
                const medal =
                  entry.rank === 1
                    ? "🥇"
                    : entry.rank === 2
                    ? "🥈"
                    : entry.rank === 3
                    ? "🥉"
                    : null;

                const mins = Math.floor(entry.total_time_seconds / 60);
                const secs = entry.total_time_seconds % 60;
                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                return (
                  <div
                    key={entry.user_id}
                    className={`p-3.5 flex items-center justify-between gap-3 ${
                      entry.rank === 1
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : entry.rank <= 3
                        ? "bg-neutral-50/60 dark:bg-neutral-800/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {medal ? (
                          <span className="text-base">{medal}</span>
                        ) : (
                          <span className="text-neutral-500 font-mono">#{entry.rank}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-1.5">
                          <span>
                            {entry.first_name} {entry.last_name || ""}
                          </span>
                          {entry.username && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-normal">
                              @{entry.username}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>Correct: {entry.correct_count}</span>
                          <span>•</span>
                          <span>Wrong: {entry.wrong_count}</span>
                          <span>•</span>
                          <span>Time: {timeStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono block">
                        {entry.score.toFixed(2)} pts
                      </span>
                      {entry.completed_at && (
                        <span className="text-[10px] text-neutral-400">
                          {formatBDTime(entry.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200/60 dark:border-white/10 shrink-0 flex justify-end bg-neutral-50/80 dark:bg-neutral-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
