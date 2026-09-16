"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Award,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import { BotSetting, ExamSession } from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { BotSessionDetailModal } from "@/components/bot/BotSessionDetailModal";

export default function BotSessionsPage() {
  const toast = useToast();

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationMode, setPaginationMode] = useState<"pages" | "infinite">("pages");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    inProgressSessions: 0,
    averageAccuracy: 0,
  });

  const searchRef = useRef(search);
  const statusRef = useRef(statusFilter);
  searchRef.current = search;
  statusRef.current = statusFilter;

  const fetchSettings = useCallback(async () => {
    try {
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch {}
  }, []);

  const fetchOverallStats = useCallback(async () => {
    try {
      const res: any = await api.get("/telegram/sessions/stats");
      if (res?.data) {
        setStats({
          totalSessions: res.data.total_sessions ?? 0,
          completedSessions: res.data.completed_sessions ?? 0,
          inProgressSessions: res.data.in_progress_sessions ?? 0,
          averageAccuracy: res.data.average_accuracy ?? 0,
        });
        return;
      }
    } catch {}

    try {
      const res: any = await api.get("/telegram/sessions?page=1&limit=100");
      const list: ExamSession[] = res?.data || [];
      const total = res?.meta?.total_count ?? list.length;
      const completed = list.filter((s) => s.status === "completed").length;
      const inProgress = list.filter((s) => s.status === "in_progress").length;
      const totalAcc = list.reduce((acc, s) => acc + (s.accuracy_percentage || 0), 0);
      const avg = list.length > 0 ? Math.round(totalAcc / list.length) : 0;
      setStats({
        totalSessions: total,
        completedSessions: completed,
        inProgressSessions: inProgress,
        averageAccuracy: avg,
      });
    } catch {}
  }, []);

  const fetchSessions = useCallback(
    async (
      page = 1,
      searchTerm = searchRef.current,
      statusVal = statusRef.current,
      append = false
    ) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setSessionsLoading(true);
        }
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }
        if (statusVal && statusVal !== "all") {
          params.set("status_filter", statusVal);
        }

        const res: any = await api.get(`/telegram/sessions?${params.toString()}`);
        if (res?.data) {
          if (append) {
            setSessions((prev) => [...prev, ...res.data]);
          } else {
            setSessions(res.data);
          }
          setCurrentPage(page);
          if (res?.meta) {
            setTotalPages(res.meta.total_pages || 1);
            setTotalCount(res.meta.total_count || 0);
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load exam sessions");
      } finally {
        setSessionsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchSettings();
    fetchOverallStats();
  }, [fetchSettings, fetchOverallStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(1, search, statusFilter, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchSessions]);

  const handlePageChange = (page: number) => {
    fetchSessions(page, search, statusFilter, false);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchSessions(currentPage + 1, search, statusFilter, true);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Exam Sessions Audit"
        icon={ClipboardList}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fetchSessions(1, search, statusFilter, false);
              fetchOverallStats();
            }}
            className="shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sessionsLoading ? "animate-spin" : ""}`} />
            <span>Refresh Audit</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Exam Sessions"
          value={stats.totalSessions}
          icon={ClipboardList}
          variant="indigo"
        />

        <StatCard
          label="Completed Sessions"
          value={stats.completedSessions}
          icon={CheckCircle2}
          variant="emerald"
        />

        <StatCard
          label="In Progress Sessions"
          value={stats.inProgressSessions}
          icon={Clock}
          variant="rose"
        />

        <StatCard
          label="Average Accuracy"
          value={`${stats.averageAccuracy}%`}
          icon={Award}
          variant="amber"
        />
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-xs border border-neutral-200/80 dark:border-white/10">
        <div className="p-4 border-b border-neutral-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, session ID..."
              leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-500/5 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-white/5 text-xs">
            <span className="text-neutral-400 px-1 text-[11px]">Status:</span>
            {[
              { id: "all", label: "All" },
              { id: "completed", label: "Completed" },
              { id: "in_progress", label: "In Progress" },
              { id: "timed_out", label: "Timed Out" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.id
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {sessionsLoading && !isLoadingMore ? (
          <TableSkeleton rows={8} />
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No examination sessions found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-500/5 dark:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold border-b border-neutral-200/60 dark:border-white/5 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Session</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Score & Accuracy</th>
                  <th className="px-5 py-3">Breakdown</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/50 dark:divide-white/5">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-white/60 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      #{s.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[150px]">
                        {s.user_name || `User #${s.user_id}`}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        ID: {s.telegram_id}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-800 dark:text-neutral-200">
                      {s.category_name || "General Standard"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">
                        {s.score} / {s.max_score}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-medium">
                        {s.accuracy_percentage}% accuracy
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[11px]">
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Check className="w-3 h-3" />
                        {s.correct_count}
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700 mx-1">/</span>
                      <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <X className="w-3 h-3" />
                        {s.wrong_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : s.status === "in_progress"
                            ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                            : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.status === "completed"
                              ? "bg-emerald-500"
                              : s.status === "in_progress"
                              ? "bg-indigo-500"
                              : "bg-neutral-400"
                          }`}
                        />
                        <span className="capitalize">{s.status?.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 font-mono text-[11px]">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <IconButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedSession(s)}
                        title="Audit Scorecard"
                        aria-label="Audit Scorecard"
                      >
                        <Eye />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-neutral-200/60 dark:border-white/5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            mode={paginationMode}
            showModeToggle={true}
            onModeChange={setPaginationMode}
            hasMore={currentPage < totalPages}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            itemLabel="sessions"
          />
        </div>
      </div>

      {selectedSession && (
        <BotSessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
