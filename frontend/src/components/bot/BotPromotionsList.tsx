"use client";

import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Eye,
  MousePointer,
  Percent,
  Tag,
  ExternalLink,
  Edit2,
  Trash2,
  Search,
} from "lucide-react";
import { TelegramPromotion } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

interface BotPromotionsListProps {
  promotions: TelegramPromotion[];
  loading: boolean;
  onNew: () => void;
  onEdit: (promo: TelegramPromotion) => void;
  onDelete: (id: number) => void;
}

export function BotPromotionsList({
  promotions,
  loading,
  onNew,
  onEdit,
  onDelete,
}: BotPromotionsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "paused" && p.is_active) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = p.title.toLowerCase();
      const text = p.content_text.toLowerCase();
      const hook = p.trigger_event.toLowerCase();
      return title.includes(q) || text.includes(q) || hook.includes(q);
    });
  }, [promotions, searchQuery, statusFilter]);

  const getHookBadgeColor = (hook: string) => {
    switch (hook) {
      case "after_exam":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "on_start":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "on_limit_reached":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-5 space-y-4 border border-neutral-200/80 dark:border-white/10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/60 dark:border-white/5">
          <div className="flex-1 max-w-sm">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-500/5 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-white/5 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "paused", label: "Paused" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === f.id
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onNew}
              className="shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : filteredPromotions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 text-neutral-400 mx-auto flex items-center justify-center">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {searchQuery || statusFilter !== "all"
                  ? "No campaigns found"
                  : "No campaigns created yet"}
              </div>
            </div>
            {!searchQuery && statusFilter === "all" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onNew}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Campaign</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPromotions.map((p) => {
              const ctr =
                p.impressions_count > 0
                  ? ((p.clicks_count / p.impressions_count) * 100).toFixed(1)
                  : "0.0";

              return (
                <div
                  key={p.id}
                  className="glass-panel p-5 rounded-3xl border border-neutral-200/80 dark:border-white/10 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-white/20 transition-all group shadow-xs space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {p.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          p.is_active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-200/80 dark:border-white/10"
                        }`}
                      >
                        {p.is_active ? "Active" : "Paused"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getHookBadgeColor(
                          p.trigger_event
                        )}`}
                      >
                        {p.trigger_event}
                      </span>
                      {p.target_category_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-200/60 dark:border-white/5">
                          <Tag className="w-2.5 h-2.5 text-neutral-400" />
                          {p.target_category_name}
                        </span>
                      )}
                      <span className="text-[10px] font-mono bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                        P{p.priority}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-neutral-500/5 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-white/5 space-y-2">
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-3 font-mono text-[11px] leading-relaxed">
                        {p.content_text}
                      </p>

                      {p.button_text && (
                        <div className="pt-2 border-t border-neutral-200/40 dark:border-white/5 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {p.button_text}
                          </span>
                          <span className="text-neutral-400 font-mono text-[10px] truncate max-w-[120px]">
                            {p.button_url}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 text-[11px]">
                      <span className="inline-flex items-center gap-1" title="Impressions">
                        <Eye className="w-3 h-3" />
                        {p.impressions_count}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Clicks">
                        <MousePointer className="w-3 h-3" />
                        {p.clicks_count}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200" title="CTR">
                        <Percent className="w-3 h-3" />
                        {ctr}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <IconButton
                        type="button"
                        onClick={() => onEdit(p)}
                        variant="ghost"
                        size="sm"
                        title="Edit campaign"
                        aria-label="Edit campaign"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton
                        type="button"
                        onClick={() => onDelete(p.id)}
                        variant="danger"
                        size="sm"
                        title="Delete campaign"
                        aria-label="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
