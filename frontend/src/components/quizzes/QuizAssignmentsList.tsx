"use client";

import React, { useState } from "react";
import {
  Calendar,
  Send,
  Trophy,
  Users,
  Clock,
  Radio,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Plus,
  Play,
  Layers,
} from "lucide-react";
import { TelegramQuizAssignment } from "@/lib/types";

interface QuizAssignmentsListProps {
  assignments: TelegramQuizAssignment[];
  loading: boolean;
  onNewAssignment: () => void;
  onAnnounce: (id: number) => Promise<void>;
  onPublishLeaderboard: (id: number) => Promise<void>;
  onViewLeaderboard: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  onSyncSchedules: () => Promise<void>;
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

export function QuizAssignmentsList({
  assignments,
  loading,
  onNewAssignment,
  onAnnounce,
  onPublishLeaderboard,
  onViewLeaderboard,
  onDelete,
  onSyncSchedules,
}: QuizAssignmentsListProps) {
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleAnnounce = async (asg: TelegramQuizAssignment) => {
    if (asg.status === "active" || asg.status === "completed" || asg.announcement_message_id) {
      window.alert("This quiz has already been posted to " + (asg.target_title || "the destination") + ". Duplicate posting is prevented.");
      return;
    }
    if (!window.confirm("Post this quiz and send all question polls to " + (asg.target_title || "the destination") + " now?")) {
      return;
    }
    try {
      setActionLoadingId(asg.id);
      await onAnnounce(asg.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublishLeaderboard = async (id: number) => {
    if (!window.confirm("Publish the official leaderboard to this channel/group now?")) {
      return;
    }
    try {
      setActionLoadingId(id);
      await onPublishLeaderboard(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel or delete this scheduled quiz?")) {
      return;
    }
    try {
      setActionLoadingId(id);
      await onDelete(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await onSyncSchedules();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl p-4 rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Scheduled & Active Channel Quizzes</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              {assignments.length} Total
            </span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Automatic countdown timers in BST (UTC+6) trigger live polls and post leaderboard rankings when time expires
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold transition-all active:scale-95"
            title="Check countdown windows and sync quiz schedules"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Schedules</span>
          </button>
          <button
            onClick={onNewAssignment}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Quiz</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 animate-pulse border border-neutral-200/60 dark:border-white/5"
            />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/40 dark:bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            No Scheduled Quizzes Found
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            Assign a quiz template to a target Telegram channel or group with a custom start & end time.
          </p>
          <button
            onClick={onNewAssignment}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign First Quiz</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((asg) => {
            const isAlreadyPosted = Boolean(asg.status !== "scheduled" || asg.announcement_message_id);

            return (
              <div
                key={asg.id}
                className="p-5 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-xl rounded-3xl border border-neutral-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        asg.status === "active"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 animate-pulse"
                          : asg.status === "scheduled"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
                          : asg.status === "completed"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {asg.status === "active" && <Play className="w-2.5 h-2.5 fill-current" />}
                      <span>{asg.status}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      <Radio className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{asg.target_title || "Unknown Target"}</span>
                    </span>

                    {asg.target_chat_id && (
                      <span className="text-[11px] font-mono text-neutral-400">
                        ({asg.target_chat_id})
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>{asg.quiz_title || "Untitled Quiz"}</span>
                    <span className="text-xs font-normal text-neutral-500 font-mono">
                      ({asg.total_questions} Questions)
                    </span>
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>
                        Start: <b>{formatBDTime(asg.start_time)}</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        End: <b>{formatBDTime(asg.end_time)}</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{asg.total_participants} Candidates Ranked</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-neutral-800/80">
                  {!isAlreadyPosted ? (
                    <button
                      onClick={() => handleAnnounce(asg)}
                      disabled={actionLoadingId === asg.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors active:scale-95 disabled:opacity-50"
                      title="Send Quiz Announcement and Live Polls to Channel Now"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Send Polls Now</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Polls Posted</span>
                    </span>
                  )}

                  <button
                    onClick={() => handlePublishLeaderboard(asg.id)}
                    disabled={actionLoadingId === asg.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors active:scale-95 disabled:opacity-50"
                    title="Publish Official Answers Key & Leaderboard to Channel"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Publish Leaderboard</span>
                  </button>

                  <button
                    onClick={() => onViewLeaderboard(asg.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors active:scale-95"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Rankings</span>
                  </button>

                  <button
                    onClick={() => handleDelete(asg.id)}
                    disabled={actionLoadingId === asg.id}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    title="Cancel Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
