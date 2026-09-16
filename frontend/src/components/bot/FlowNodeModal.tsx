"use client";

import React, { useState, useEffect } from "react";
import {
  FolderTree,
  FileText,
  ExternalLink,
  PlayCircle,
  Layers,
  Sparkles,
  Gauge,
} from "lucide-react";
import { BotFlowNode } from "@/lib/types";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { CategoryTreeSelect } from "@/components/categories/CategoryTreeSelect";

interface FlowNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: BotFlowNode | null;
  parentId?: number | null;
  parentLabel?: string | null;
}

const ACTION_OPTIONS = [
  { value: "menu_nodes", label: "Submenu", icon: Layers, desc: "Shows child buttons" },
  { value: "start_exam", label: "Start Exam", icon: PlayCircle, desc: "Launches exam session" },
  { value: "category_browse", label: "Browse Topics", icon: FolderTree, desc: "Shows topic branches" },
  { value: "limits_check", label: "Check Limits", icon: Gauge, desc: "Shows quota & cooldown" },
  { value: "text_message", label: "Information", icon: FileText, desc: "Sends text/HTML answer" },
  { value: "url_link", label: "External Link", icon: ExternalLink, desc: "Opens external website" },
];

export function FlowNodeModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  parentId,
  parentLabel,
}: FlowNodeModalProps) {
  const [label, setLabel] = useState("");
  const [triggerCommand, setTriggerCommand] = useState("");
  const [actionType, setActionType] = useState<BotFlowNode["action_type"]>("menu_nodes");
  const [contentText, setContentText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pickingStrategy, setPickingStrategy] = useState<BotFlowNode["picking_strategy"]>("direct_start");
  const [questionCountMode, setQuestionCountMode] = useState<BotFlowNode["question_count_mode"]>("fixed_count");
  const [fixedCount, setFixedCount] = useState(10);
  const [difficultyMode, setDifficultyMode] = useState<BotFlowNode["difficulty_mode"]>("fixed_difficulty");
  const [fixedDifficulty, setFixedDifficulty] = useState<BotFlowNode["fixed_difficulty"]>("mixed");
  const [scopeMode, setScopeMode] = useState<BotFlowNode["scope_mode"]>("ask_user");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [negativeMarkingRate, setNegativeMarkingRate] = useState(0);
  const [url, setUrl] = useState("");
  const [rowIndex, setRowIndex] = useState(0);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setLabel(initialData.label || "");
      setTriggerCommand(initialData.trigger_command || "");
      setActionType(initialData.action_type || "menu_nodes");
      setContentText(initialData.content_text || "");
      setCategoryId(initialData.category_id || "");
      setPickingStrategy(initialData.picking_strategy || "direct_start");
      setQuestionCountMode(initialData.question_count_mode || "fixed_count");
      setFixedCount(initialData.fixed_count || 10);
      setDifficultyMode(initialData.difficulty_mode || "fixed_difficulty");
      setFixedDifficulty(initialData.fixed_difficulty || "mixed");
      setScopeMode(initialData.scope_mode || "ask_user");
      setTimerSeconds(initialData.timer_seconds || 0);
      setNegativeMarkingRate(initialData.negative_marking_rate || 0);
      setUrl(initialData.url || "");
      setRowIndex(initialData.row_index || 0);
      setSortOrder(initialData.sort_order || 0);
      setIsActive(initialData.is_active ?? true);
    } else {
      setLabel("");
      setTriggerCommand("");
      setActionType("menu_nodes");
      setContentText("");
      setCategoryId("");
      setPickingStrategy("direct_start");
      setQuestionCountMode("fixed_count");
      setFixedCount(10);
      setDifficultyMode("fixed_difficulty");
      setFixedDifficulty("mixed");
      setScopeMode("ask_user");
      setTimerSeconds(0);
      setNegativeMarkingRate(0);
      setUrl("");
      setRowIndex(0);
      setSortOrder(0);
      setIsActive(true);
    }
    setError(null);
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Button label is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      parent_id: initialData ? initialData.parent_id : parentId || null,
      trigger_command: triggerCommand.trim() ? triggerCommand.trim() : null,
      label: label.trim(),
      action_type: actionType,
      content_text: contentText.trim() ? contentText.trim() : null,
      category_id: categoryId || null,
      picking_strategy: pickingStrategy,
      question_count_mode: questionCountMode,
      fixed_count: Number(fixedCount) || 10,
      difficulty_mode: difficultyMode,
      fixed_difficulty: fixedDifficulty,
      scope_mode: scopeMode,
      timer_seconds: Number(timerSeconds) || 0,
      negative_marking_rate: Number(negativeMarkingRate) || 0,
      url: url.trim() ? url.trim() : null,
      row_index: Number(rowIndex) || 0,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    try {
      if (initialData?.id) {
        await api.put(`/telegram/flow/${initialData.id}`, payload);
      } else {
        await api.post("/telegram/flow", payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save flow node");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Flow Action" : "New Flow Action"}
      description={parentLabel ? `Submenu under "${parentLabel}"` : undefined}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Button Label <span className="text-rose-500">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Start Exam, View Topics"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Trigger Command (Optional)
            </label>
            <Input
              value={triggerCommand}
              onChange={(e) => setTriggerCommand(e.target.value)}
              placeholder="/start, /exam, /help"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Action Behavior
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ACTION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSel = actionType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActionType(opt.value as any)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-2xl border text-left transition-all ${
                    isSel
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-xs"
                      : "bg-white/60 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-white/20"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSel ? "text-indigo-400 dark:text-indigo-600" : "text-neutral-500"}`} />
                  <div>
                    <div className="font-semibold text-xs leading-tight">{opt.label}</div>
                    <div className={`text-[10px] mt-0.5 leading-tight line-clamp-1 ${isSel ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400"}`}>
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Textarea
            label="Reply Message"
            rows={3}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Message text sent to user..."
            className="font-mono"
          />
        </div>

        {actionType === "url_link" && (
          <div>
            <Input
              label="Destination URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/admission-info"
            />
          </div>
        )}

        {(actionType === "start_exam" || actionType === "category_browse") && (
          <div className="glass-panel p-4 rounded-2xl space-y-3 border border-neutral-200/80 dark:border-white/10">
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Exam Strategy & Category Scope
            </div>

            <CategoryTreeSelect
              label="Target Taxonomy Category"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select subject, topic, or standard..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Question Sourcing"
                value={pickingStrategy}
                onChange={(e) => setPickingStrategy(e.target.value as any)}
              >
                <option value="direct_start">Direct Instant Start</option>
                <option value="subject_wise">Subject-Wise Balanced</option>
                <option value="random_overall">Pure Random</option>
                <option value="ask_user">Prompt Candidate</option>
              </Select>

              <Select
                label="Question Scope"
                value={scopeMode}
                onChange={(e) => setScopeMode(e.target.value as any)}
              >
                <option value="ask_user">User Decide (Prompt Candidate)</option>
                <option value="include_subtopics">Include All Subtopics</option>
                <option value="exact_category_only">Exact Category Only</option>
              </Select>

              <Select
                label="Question Count Mode"
                value={questionCountMode}
                onChange={(e) => setQuestionCountMode(e.target.value as any)}
              >
                <option value="fixed_count">Fixed Count</option>
                <option value="ask_user">User Decide (Prompt Candidate)</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {questionCountMode === "fixed_count" && (
                <Input
                  label="Questions Count"
                  type="number"
                  min="1"
                  max="100"
                  value={fixedCount}
                  onChange={(e) => setFixedCount(Number(e.target.value))}
                />
              )}

              <Select
                label="Difficulty Mode"
                value={difficultyMode}
                onChange={(e) => setDifficultyMode(e.target.value as any)}
              >
                <option value="fixed_difficulty">Fixed Level</option>
                <option value="ask_user">Prompt Candidate</option>
              </Select>

              {difficultyMode === "fixed_difficulty" && (
                <Select
                  label="Difficulty Level"
                  value={fixedDifficulty}
                  onChange={(e) => setFixedDifficulty(e.target.value as any)}
                >
                  <option value="mixed">Mixed (All levels)</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </Select>
              )}

              <Input
                label="Timer per Q (Sec)"
                type="number"
                min="0"
                max="600"
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value))}
                placeholder="0 (untimed)"
              />

              <Input
                label="Negative Mark Rate"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={negativeMarkingRate}
                onChange={(e) => setNegativeMarkingRate(Number(e.target.value))}
                placeholder="0.25"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
          <Input
            label="Keyboard Row Index"
            type="number"
            min="0"
            max="20"
            value={rowIndex}
            onChange={(e) => setRowIndex(Number(e.target.value))}
          />

          <Input
            label="Sort Order in Row"
            type="number"
            min="0"
            max="50"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />

          <div className="pb-3">
            <Checkbox
              label="Active Action"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/60 dark:border-white/5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
          >
            {initialData ? "Update Action" : "Create Action"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
