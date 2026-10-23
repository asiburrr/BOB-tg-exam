"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy,
  Calendar,
  BookOpen,
  Radio,
  Plus,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/feedback/Toast";
import { api } from "@/lib/api";
import {
  BotSetting,
  TelegramQuiz,
  TelegramQuizTarget,
  TelegramQuizAssignment,
  QuestionCategory,
} from "@/lib/types";
import { BotPageHeader } from "@/components/bot/BotPageHeader";
import { StatCard } from "@/components/ui/Card";
import { QuizAssignmentsList } from "@/components/quizzes/QuizAssignmentsList";
import { QuizList } from "@/components/quizzes/QuizList";
import { QuizTargetsList } from "@/components/quizzes/QuizTargetsList";
import { QuizTargetModal } from "@/components/quizzes/QuizTargetModal";
import { QuizDesignerModal } from "@/components/quizzes/QuizDesignerModal";
import { QuizAssignModal } from "@/components/quizzes/QuizAssignModal";
import { QuizLeaderboardModal } from "@/components/quizzes/QuizLeaderboardModal";

export default function BotQuizzesPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"assignments" | "quizzes" | "targets">("assignments");

  const [settings, setSettings] = useState<BotSetting | null>(null);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [targets, setTargets] = useState<TelegramQuizTarget[]>([]);
  const [quizzes, setQuizzes] = useState<TelegramQuiz[]>([]);
  const [assignments, setAssignments] = useState<TelegramQuizAssignment[]>([]);

  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TelegramQuizTarget | null>(null);

  const [designerModalOpen, setDesignerModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<TelegramQuiz | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [preselectedQuiz, setPreselectedQuiz] = useState<TelegramQuiz | null>(null);

  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res: any = await api.get("/telegram/settings");
      if (res?.data) {
        setSettings(res.data);
      }
    } catch {}
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res: any = await api.get("/categories");
      if (res?.data) {
        setCategories(res.data);
      }
    } catch {}
  }, []);

  const fetchTargets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingTargets(true);
      const res: any = await api.get("/telegram/quiz-targets");
      if (res?.data) {
        setTargets(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load quiz targets");
    } finally {
      if (!silent) setLoadingTargets(false);
    }
  }, [toast]);

  const fetchQuizzes = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingQuizzes(true);
      const res: any = await api.get("/telegram/quizzes");
      if (res?.data) {
        setQuizzes(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load quizzes");
    } finally {
      if (!silent) setLoadingQuizzes(false);
    }
  }, [toast]);

  const fetchAssignments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingAssignments(true);
      const res: any = await api.get("/telegram/quiz-assignments");
      if (res?.data) {
        setAssignments(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load assignments");
    } finally {
      if (!silent) setLoadingAssignments(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchTargets();
    fetchQuizzes();
    fetchAssignments();
  }, [fetchSettings, fetchCategories, fetchTargets, fetchQuizzes, fetchAssignments]);

  const stats = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status === "active").length;
    const scheduledAssignments = assignments.filter((a) => a.status === "scheduled").length;
    const totalParticipants = assignments.reduce((acc, a) => acc + (a.total_participants || 0), 0);
    return {
      activeAssignments,
      scheduledAssignments,
      totalQuizzes: quizzes.length,
      totalTargets: targets.length,
      totalParticipants,
    };
  }, [assignments, quizzes, targets]);

  const handleSaveTarget = async (data: Partial<TelegramQuizTarget>) => {
    if (editingTarget) {
      await api.put(`/telegram/quiz-targets/${editingTarget.id}`, data);
      toast.success("Target updated successfully");
    } else {
      await api.post("/telegram/quiz-targets", data);
      toast.success("Target added successfully");
    }
    fetchTargets(true);
  };

  const handleDeleteTarget = async (id: number) => {
    try {
      await api.delete(`/telegram/quiz-targets/${id}`);
      toast.success("Target deleted successfully");
      fetchTargets(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete target");
    }
  };

  const handleToggleActiveTarget = async (target: TelegramQuizTarget) => {
    try {
      await api.put(`/telegram/quiz-targets/${target.id}`, { is_active: !target.is_active });
      toast.success(`Target is now ${!target.is_active ? "Active" : "Inactive"}`);
      fetchTargets(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle status");
    }
  };

  const handleSaveQuiz = async (data: Partial<TelegramQuiz> & { question_ids: string[] }) => {
    if (editingQuiz) {
      await api.put(`/telegram/quizzes/${editingQuiz.id}`, data);
      toast.success("Quiz updated successfully");
    } else {
      await api.post("/telegram/quizzes", data);
      toast.success("Quiz designed successfully");
    }
    fetchQuizzes(true);
  };

  const handleDeleteQuiz = async (id: number) => {
    try {
      await api.delete(`/telegram/quizzes/${id}`);
      toast.success("Quiz deleted successfully");
      fetchQuizzes(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete quiz");
    }
  };

  const handleAssignQuiz = (quiz: TelegramQuiz) => {
    setPreselectedQuiz(quiz);
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async (data: {
    quiz_id: number;
    target_id: number;
    start_time: string;
    end_time: string;
    announce_now: boolean;
  }) => {
    await api.post("/telegram/quiz-assignments", data);
    toast.success("Quiz scheduled and assigned successfully");
    fetchAssignments(true);
    setActiveTab("assignments");
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await api.delete(`/telegram/quiz-assignments/${id}`);
      toast.success("Assignment removed");
      fetchAssignments(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete assignment");
    }
  };

  const handleAnnounceAssignment = async (id: number) => {
    try {
      await api.post(`/telegram/quiz-assignments/${id}/announce`);
      toast.success("Announcement published to channel/group!");
      fetchAssignments(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to post announcement");
    }
  };

  const handlePublishLeaderboard = async (id: number) => {
    try {
      await api.post(`/telegram/quiz-assignments/${id}/publish-leaderboard`);
      toast.success("Leaderboard published to channel/group!");
      fetchAssignments(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish leaderboard");
    }
  };

  const handleSyncSchedules = async () => {
    try {
      await api.post("/telegram/quiz-assignments/sync-schedules");
      toast.success("Quiz schedules synchronized");
      fetchAssignments(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync schedules");
    }
  };

  const handleViewLeaderboard = (id: number) => {
    setActiveAssignmentId(id);
    setLeaderboardModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <BotPageHeader
        title="Channel & Group Quizzes"
        description="Schedule live quizzes for Telegram channels & groups with automatic countdowns and leaderboard publishing."
        icon={Trophy}
        botUsername={settings?.bot_username}
        webhookOk={settings?.is_webhook_active}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingTarget(null);
                setTargetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 active:scale-95 transition-all"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Target</span>
            </button>
            <button
              onClick={() => {
                setEditingQuiz(null);
                setDesignerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 active:scale-95 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Design Quiz</span>
            </button>
            <button
              onClick={() => {
                setPreselectedQuiz(null);
                setAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Quiz</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active & Scheduled"
          value={`${stats.activeAssignments + stats.scheduledAssignments}`}
          icon={Clock}
          variant="indigo"
        />
        <StatCard
          label="Quiz Templates"
          value={stats.totalQuizzes}
          icon={BookOpen}
          variant="violet"
        />
        <StatCard
          label="Target Channels"
          value={stats.totalTargets}
          icon={Radio}
          variant="emerald"
        />
        <StatCard
          label="Ranked Candidates"
          value={stats.totalParticipants}
          icon={Users}
          variant="amber"
        />
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/60 backdrop-blur-md w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === "assignments"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled & Active Quizzes</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 font-mono">
            {assignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quizzes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === "quizzes"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Quiz Designer</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 font-mono">
            {quizzes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("targets")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === "targets"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Target Destinations</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-neutral-100 dark:bg-neutral-800 font-mono">
            {targets.length}
          </span>
        </button>
      </div>

      {activeTab === "assignments" && (
        <QuizAssignmentsList
          assignments={assignments}
          loading={loadingAssignments}
          onNewAssignment={() => {
            setPreselectedQuiz(null);
            setAssignModalOpen(true);
          }}
          onAnnounce={handleAnnounceAssignment}
          onPublishLeaderboard={handlePublishLeaderboard}
          onViewLeaderboard={handleViewLeaderboard}
          onDelete={handleDeleteAssignment}
          onSyncSchedules={handleSyncSchedules}
        />
      )}

      {activeTab === "quizzes" && (
        <QuizList
          quizzes={quizzes}
          loading={loadingQuizzes}
          onAdd={() => {
            setEditingQuiz(null);
            setDesignerModalOpen(true);
          }}
          onEdit={(q) => {
            setEditingQuiz(q);
            setDesignerModalOpen(true);
          }}
          onDelete={handleDeleteQuiz}
          onAssign={handleAssignQuiz}
        />
      )}

      {activeTab === "targets" && (
        <QuizTargetsList
          targets={targets}
          loading={loadingTargets}
          onAdd={() => {
            setEditingTarget(null);
            setTargetModalOpen(true);
          }}
          onEdit={(t) => {
            setEditingTarget(t);
            setTargetModalOpen(true);
          }}
          onDelete={handleDeleteTarget}
          onToggleActive={handleToggleActiveTarget}
        />
      )}

      <QuizTargetModal
        isOpen={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        onSave={handleSaveTarget}
        target={editingTarget}
      />

      <QuizDesignerModal
        isOpen={designerModalOpen}
        onClose={() => setDesignerModalOpen(false)}
        onSave={handleSaveQuiz}
        quiz={editingQuiz}
        categories={categories}
      />

      <QuizAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleSaveAssignment}
        preselectedQuiz={preselectedQuiz}
        quizzes={quizzes}
        targets={targets}
      />

      <QuizLeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        assignmentId={activeAssignmentId}
      />
    </div>
  );
}
