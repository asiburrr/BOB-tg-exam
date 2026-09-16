"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Layers,
  Users,
  ClipboardCheck,
  Bot,
  Send,
  Megaphone,
  Plus,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  FolderTree,
  FileSpreadsheet,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { StatCard } from "@/components/ui/Card";
import { BotSessionDetailModal } from "@/components/bot/BotSessionDetailModal";
import { api } from "@/lib/api";
import {
  BotSetting,
  ExamSession,
  QuestionCategory,
  TelegramPromotion,
  TelegramUser,
} from "@/lib/types";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [totalExamSessionsCount, setTotalExamSessionsCount] = useState(0);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [promotions, setPromotions] = useState<TelegramPromotion[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [qRes, catRes, setRes, uRes, sRes, pRes]: any = await Promise.all([
        api.get("/questions?page=1&page_size=1"),
        api.get("/questions/categories"),
        api.get("/telegram/settings"),
        api.get("/telegram/users?page=1&limit=100"),
        api.get("/telegram/sessions?page=1&limit=8"),
        api.get("/telegram/promotions"),
      ]);

      const qTotal = qRes?.meta?.total_count ?? qRes?.total_count ?? qRes?.total ?? 0;
      setTotalQuestions(qTotal);

      if (catRes?.data) setCategories(catRes.data);
      if (setRes?.data) setSettings(setRes.data);

      if (uRes?.data) {
        setUsers(uRes.data);
        setTotalCandidatesCount(uRes?.meta?.total_count ?? uRes.data.length);
      }
      if (sRes?.data) {
        setSessions(sRes.data);
        setTotalExamSessionsCount(sRes?.meta?.total_count ?? sRes.data.length);
      }
      if (pRes?.data) setPromotions(pRes.data);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const totalCandidates = totalCandidatesCount || users.length;
    const totalExamSessions = totalExamSessionsCount || sessions.length;
    const activePromos = promotions.filter((p) => p.is_active).length;
    return {
      totalCategories,
      totalCandidates,
      totalExamSessions,
      activePromos,
    };
  }, [categories, users, sessions, promotions, totalCandidatesCount, totalExamSessionsCount]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Live telemetry for question bank taxonomy and Telegram bot examinations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            variant="ghost"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            aria-label="Refresh Dashboard"
          />
          <Link href="/admin/questions/bulk">
            <Button variant="secondary" size="sm" className="shadow-xs">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Entry</span>
            </Button>
          </Link>
          <Link href="/admin/questions/new">
            <Button variant="primary" size="sm" className="shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>New Question</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Question Bank"
          value={totalQuestions}
          icon={HelpCircle}
          variant="indigo"
        />
        <StatCard
          label="Categories & Topics"
          value={stats.totalCategories}
          icon={Layers}
          variant="violet"
        />
        <StatCard
          label="Enrolled Candidates"
          value={stats.totalCandidates}
          icon={Users}
          variant="amber"
        />
        <StatCard
          label="Completed Exams"
          value={stats.totalExamSessions}
          icon={ClipboardCheck}
          variant="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-neutral-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-neutral-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FolderTree className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {totalQuestions} Active Questions
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Taxonomy & Question Bank
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Structured multi-level subjects, difficulty taxonomy, and bulk question ingestion.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-neutral-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center gap-2">
            <Link href="/admin/questions" className="w-full sm:w-1/2">
              <Button variant="secondary" size="sm" className="w-full justify-between">
                <span>View Bank</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/admin/categories" className="w-full sm:w-1/2">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Taxonomy Tree</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-neutral-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-neutral-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                settings?.is_webhook_active
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                {settings?.is_webhook_active ? "Webhook Active" : "Polling / Idle"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Telegram Bot Studio
                </h2>
                {settings?.bot_username && (
                  <span className="text-xs font-mono font-medium text-neutral-500 dark:text-neutral-400">
                    @{settings.bot_username}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Conversational flow trees, automated quiz delivery, and attempt quota limits.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-neutral-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center gap-2">
            <Link href="/admin/bot" className="w-full sm:w-1/2">
              <Button variant="secondary" size="sm" className="w-full justify-between">
                <span>Flow Builder</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/admin/bot/candidates" className="w-full sm:w-1/2">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Candidates</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-neutral-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-neutral-300 dark:hover:border-white/20 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {stats.activePromos} Campaigns Active
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Growth & Broadcasts
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Targeted post-exam promotions, community access locks, and push broadcasts.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-neutral-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center gap-2">
            <Link href="/admin/bot/broadcast" className="w-full sm:w-1/2">
              <Button variant="secondary" size="sm" className="w-full justify-between">
                <span>Broadcast</span>
                <Send className="w-3 h-3 text-indigo-500" />
              </Button>
            </Link>
            <Link href="/admin/bot/campaigns" className="w-full sm:w-1/2">
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Campaigns</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-neutral-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Recent Examination Sessions
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Live candidate submissions and scorecard telemetry.
              </p>
            </div>
          </div>

          <Link href="/admin/bot/sessions">
            <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400">
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No examination sessions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-white/10 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="pb-2.5 font-semibold">Session ID</th>
                  <th className="pb-2.5 font-semibold">Candidate</th>
                  <th className="pb-2.5 font-semibold">Category</th>
                  <th className="pb-2.5 font-semibold">Questions</th>
                  <th className="pb-2.5 font-semibold">Score / Accuracy</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Started At</th>
                  <th className="pb-2.5 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className="hover:bg-neutral-500/10 dark:hover:bg-white/[0.06] transition-all cursor-pointer group"
                  >
                    <td className="py-3 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                      #{s.id}
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {s.user_name || `Candidate #${s.user_id}`}
                      </div>
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {s.category_name || "General Test Bank"}
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {s.total_questions} Qs
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-neutral-200/80 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, s.accuracy_percentage || 0))}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                          {s.accuracy_percentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        s.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : s.status === "in_progress"
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                      {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedSession(s)}
                        className="shadow-xs"
                      >
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Scorecard</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
