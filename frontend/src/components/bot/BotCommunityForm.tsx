"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  Save,
  Lock,
  Radio,
} from "lucide-react";
import { BotSetting, ForceJoinChannelItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input, Textarea } from "@/components/ui/Input";
import { FormSkeleton } from "@/components/ui/Skeleton";

interface BotCommunityFormProps {
  settings: BotSetting | null;
  loading: boolean;
  onChange: (updated: BotSetting) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function BotCommunityForm({
  settings,
  loading,
  onChange,
  onSubmit,
}: BotCommunityFormProps) {
  const [channels, setChannels] = useState<ForceJoinChannelItem[]>([]);

  useEffect(() => {
    if (settings?.force_join_channels) {
      try {
        const parsed = JSON.parse(settings.force_join_channels);
        if (Array.isArray(parsed)) {
          setChannels(parsed);
          return;
        }
      } catch {
      }
    }
    setChannels([]);
  }, [settings?.force_join_channels]);

  if (loading && !settings) {
    return <FormSkeleton />;
  }

  if (!settings) return null;

  const updateChannelsState = (newChannels: ForceJoinChannelItem[]) => {
    setChannels(newChannels);
    onChange({
      ...settings,
      force_join_channels: JSON.stringify(newChannels),
    });
  };

  const handleAddChannel = () => {
    const updated = [
      ...channels,
      { title: "", chat_id: "", invite_link: "" },
    ];
    updateChannelsState(updated);
  };

  const handleRemoveChannel = (index: number) => {
    const updated = channels.filter((_, i) => i !== index);
    updateChannelsState(updated);
  };

  const handleChannelChange = (
    index: number,
    field: keyof ForceJoinChannelItem,
    value: string
  ) => {
    const updated = [...channels];
    updated[index] = { ...updated[index], [field]: value };
    updateChannelsState(updated);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200/60 dark:border-white/5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Mandatory Membership Criteria</span>
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                settings.force_join_enabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  settings.force_join_enabled
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-neutral-400"
                }`}
              />
              {settings.force_join_enabled ? "Active & Enforced" : "Disabled"}
            </span>
          </div>

          <label className="relative flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-white/5 cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/50 transition-all">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Require candidates to join community before using bot
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Unverified users will see a join prompt with verification button
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(settings.force_join_enabled)}
              onChange={(e) =>
                onChange({ ...settings, force_join_enabled: e.target.checked })
              }
              className="w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-600 text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
          </label>

          {settings.force_join_enabled && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Required Channels & Groups ({channels.length})</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddChannel}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Community</span>
                </Button>
              </div>

              {channels.length === 0 ? (
                <div className="py-8 text-center rounded-2xl border border-dashed border-neutral-200/80 dark:border-white/10 bg-neutral-500/5">
                  <p className="text-xs text-neutral-500">
                    No channels or groups added yet. Click &quot;Add Community&quot; to configure criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {channels.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Community Item #{idx + 1}
                        </span>
                        <IconButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveChannel(idx)}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          label="Display Title"
                          value={ch.title}
                          onChange={(e) =>
                            handleChannelChange(idx, "title", e.target.value)
                          }
                          placeholder="e.g. Official Study Channel"
                          required
                        />
                        <Input
                          label="@Username or Chat ID"
                          value={ch.chat_id}
                          onChange={(e) =>
                            handleChannelChange(idx, "chat_id", e.target.value)
                          }
                          placeholder="e.g. @study_channel or -100..."
                          required
                        />
                        <Input
                          label="Direct Invite Link"
                          value={ch.invite_link || ""}
                          onChange={(e) =>
                            handleChannelChange(idx, "invite_link", e.target.value)
                          }
                          placeholder="e.g. https://t.me/..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Textarea
                  label="Access Restriction Message"
                  rows={3}
                  value={settings.force_join_message || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      force_join_message: e.target.value,
                    })
                  }
                  placeholder="To access this examination portal, please join our official channels and groups below."
                  className="font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200/60 dark:border-white/5">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Group & Channel Availability Policy</span>
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                settings.group_access_mode === "allowed_only"
                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                  : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10"
              }`}
            >
              {settings.group_access_mode === "allowed_only"
                ? "Selected Groups Only"
                : "Block All Groups"}
            </span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-white/5 cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/50 transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Block all groups & channels (Private 1-on-1 only)
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Bot will automatically leave any group or channel it gets added to
                </div>
              </div>
              <input
                type="radio"
                name="group_access_mode"
                checked={settings.group_access_mode !== "allowed_only"}
                onChange={() =>
                  onChange({ ...settings, group_access_mode: "all_blocked" })
                }
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-white/5 cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/50 transition-all">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Allow selected groups & channels
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Bot will remain active in specified groups while automatically leaving unauthorized ones
                </div>
              </div>
              <input
                type="radio"
                name="group_access_mode"
                checked={settings.group_access_mode === "allowed_only"}
                onChange={() =>
                  onChange({ ...settings, group_access_mode: "allowed_only" })
                }
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
            </label>
          </div>

          {settings.group_access_mode === "allowed_only" && (
            <div className="space-y-4 pt-2">
              <div>
                <Textarea
                  label="Authorized Group & Channel IDs / @Usernames"
                  rows={3}
                  value={settings.allowed_group_ids || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      allowed_group_ids: e.target.value,
                    })
                  }
                  placeholder="e.g. @exam_study_group, -100192837465, @practice_channel"
                  className="font-mono"
                  helperText="Separate multiple group IDs or usernames with commas or line breaks."
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/40 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-white/5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Run Commands in Private Chat Only
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Commands sent in groups will prompt candidates with a direct link to open private chat
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settings.group_commands_in_private}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        group_commands_in_private: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                </label>

                {settings.group_commands_in_private && (
                  <div className="pt-2 border-t border-neutral-200/60 dark:border-white/5">
                    <Textarea
                      label="Group Redirection Message"
                      rows={2}
                      value={settings.group_redirect_message || ""}
                      onChange={(e) =>
                        onChange({
                          ...settings,
                          group_redirect_message: e.target.value,
                        })
                      }
                      placeholder="👋 Hello {name}! To protect candidate privacy and prevent group clutter, exams and bot commands are conducted in direct private chat."
                      className="font-mono"
                      helperText="Use {name} to insert candidate's first name."
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Access Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
