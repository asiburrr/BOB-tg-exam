"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Radio, MessageSquare, AlertCircle } from "lucide-react";
import { TelegramQuizTarget } from "@/lib/types";

interface QuizTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TelegramQuizTarget>) => Promise<void>;
  target?: TelegramQuizTarget | null;
}

export function QuizTargetModal({ isOpen, onClose, onSave, target }: QuizTargetModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [chatId, setChatId] = useState("");
  const [chatType, setChatType] = useState<"channel" | "group" | "supergroup">("channel");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (target) {
      setTitle(target.title || "");
      setChatId(target.chat_id || "");
      setChatType(target.chat_type || "channel");
      setDescription(target.description || "");
      setIsActive(target.is_active ?? true);
    } else {
      setTitle("");
      setChatId("");
      setChatType("channel");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [target, isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for this target channel or group.");
      return;
    }
    if (!chatId.trim()) {
      setError("Please specify the Telegram Chat ID or @channelusername.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSave({
        title: title.trim(),
        chat_id: chatId.trim(),
        chat_type: chatType,
        description: description.trim() || undefined,
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save quiz target.");
    } finally {
      setLoading(false);
    }
  };

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
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {target ? "Edit Target Destination" : "Add Target Channel or Group"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Channels and groups authorized for quiz broadcasts & leaderboards
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
              Target Display Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official BCS Candidates Group"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Target Type *
              </label>
              <select
                value={chatType}
                onChange={(e) => setChatType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="channel">Telegram Channel</option>
                <option value="group">Public/Private Group</option>
                <option value="supergroup">Supergroup</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Chat ID or @handle *
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. @MyChannel or -100123456789"
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Description / Internal Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Main channel for batch 2026 BCS preparation."
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5">
            <div>
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                Active Status
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Allow scheduled quizzes and leaderboard posts to this destination
              </span>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : target ? "Update Target" : "Add Target"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
