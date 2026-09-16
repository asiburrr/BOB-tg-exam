"use client";

import React from "react";
import {
  Sliders,
  ShieldCheck,
  Save,
  Hourglass,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { BotSetting } from "@/lib/types";

interface BotLimitsFormProps {
  settings: BotSetting | null;
  loading: boolean;
  onChange: (updated: BotSetting) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function BotLimitsForm({
  settings,
  loading,
  onChange,
  onSubmit,
}: BotLimitsFormProps) {
  if (loading && !settings) {
    return <FormSkeleton />;
  }

  if (!settings) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200/60 dark:border-white/5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Candidate Quota Policy
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                settings.limit_enabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  settings.limit_enabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                }`}
              />
              {settings.limit_enabled ? "Limits Enforced" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5">
            <span className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
              Enable Attempt Limiting System
            </span>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.limit_enabled || false}
                onChange={(e) =>
                  onChange({ ...settings, limit_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-neutral-900 dark:peer-checked:bg-white" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Quota Reset Window"
              value={settings.limit_period || "daily"}
              onChange={(e) =>
                onChange({ ...settings, limit_period: e.target.value as any })
              }
            >
              <option value="hourly">Hourly Reset (Every 60 Minutes)</option>
              <option value="daily">Daily Reset (Every 24 Hours)</option>
              <option value="weekly">Weekly Reset (Every 7 Days)</option>
              <option value="monthly">Monthly Reset (Every 30 Days)</option>
              <option value="custom_interval">Custom Rolling Interval</option>
            </Select>

            {settings.limit_period === "custom_interval" ? (
              <Input
                label="Custom Window Hours"
                type="number"
                min={1}
                max={720}
                value={settings.custom_interval_hours || 24}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    custom_interval_hours: Number(e.target.value),
                  })
                }
              />
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  VIP Bypass Policy
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-neutral-500/5 dark:bg-neutral-850 border border-neutral-200/80 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 h-[38px]">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>VIP candidates bypass quota limits.</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Allowed Exams Per Window"
              type="number"
              min={1}
              max={500}
              value={settings.max_exams_per_period || 5}
              onChange={(e) =>
                onChange({
                  ...settings,
                  max_exams_per_period: Number(e.target.value),
                })
              }
            />

            <Input
              label="Max Questions Solved Per Window"
              type="number"
              min={1}
              max={5000}
              value={settings.max_questions_per_period || 100}
              onChange={(e) =>
                onChange({
                  ...settings,
                  max_questions_per_period: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200/60 dark:border-white/5">
            <Input
              label="Mandatory Cooldown Minutes"
              type="number"
              min={0}
              max={1440}
              value={settings.cooldown_minutes || 0}
              onChange={(e) =>
                onChange({
                  ...settings,
                  cooldown_minutes: Number(e.target.value),
                })
              }
              placeholder="0 for none"
            />

            <Input
              label="Question Count Presets"
              type="text"
              value={settings.default_count_presets || "5,10,20,25,50"}
              onChange={(e) =>
                onChange({ ...settings, default_count_presets: e.target.value })
              }
              placeholder="5,10,20,25,50"
              className="font-mono"
            />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-4 shadow-xs">
          <div className="border-b border-neutral-200/60 dark:border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Cooldown Message
            </h3>
          </div>

          <Textarea
            label="Template"
            value={settings.cooldown_message || ""}
            onChange={(e) =>
              onChange({
                ...settings,
                cooldown_message: e.target.value,
              })
            }
            rows={3}
            placeholder="Cooldown active. Please wait {cooldown_remaining} before your next attempt."
            className="font-mono"
            helperText="Supported tags: {cooldown_remaining}, {remaining_exams}, {max_exams}, {quota_reset_in}"
          />
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-4 shadow-xs">
          <div className="border-b border-neutral-200/60 dark:border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Limit Reached Message
            </h3>
          </div>

          <Textarea
            label="Template"
            value={settings.limit_reached_message || ""}
            onChange={(e) =>
              onChange({
                ...settings,
                limit_reached_message: e.target.value,
              })
            }
            rows={3}
            placeholder="Exam limit reached ({max_exams}). Your quota resets in {quota_reset_in}."
            className="font-mono"
            helperText="Supported tags: {quota_reset_in}, {remaining_exams}, {max_exams}"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Rules</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
