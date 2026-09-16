"use client";

import React, { useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  AlertTriangle,
  Copy,
  Check,
  Globe,
  Key,
  Trash2,
  Shield,
} from "lucide-react";
import { BotSetting, WebhookInfo } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { FormSkeleton } from "@/components/ui/Skeleton";

interface BotWebhookFormProps {
  settings: BotSetting | null;
  webhookInfo: WebhookInfo | null;
  loading: boolean;
  webhookLoading: boolean;
  onChange: (updated: BotSetting) => void;
  onSave: (e: React.FormEvent) => void;
  onSetWebhook: () => void;
  onDeleteWebhook: () => void;
  onTestConnection: () => void;
  onRefreshInfo: () => void;
}

export function BotWebhookForm({
  settings,
  webhookInfo,
  loading,
  webhookLoading,
  onChange,
  onSave,
  onSetWebhook,
  onDeleteWebhook,
  onTestConnection,
  onRefreshInfo,
}: BotWebhookFormProps) {
  const [showToken, setShowToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (loading && !settings) {
    return <FormSkeleton />;
  }

  if (!settings) return null;

  const handleCopyWebhookUrl = () => {
    if (!settings.webhook_url) return;
    navigator.clipboard.writeText(settings.webhook_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form
        onSubmit={onSave}
        className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-5 shadow-xs"
      >
        <div className="border-b border-neutral-200/60 dark:border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Telegram Bot API Credentials
          </h2>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTestConnection}
            disabled={webhookLoading || !settings.bot_token}
            className="shadow-xs self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Test Connection</span>
          </Button>
        </div>

        <div>
          <Input
            label="Telegram Bot API Token"
            required
            type={showToken ? "text" : "password"}
            value={settings.bot_token || ""}
            onChange={(e) =>
              onChange({ ...settings, bot_token: e.target.value })
            }
            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
            className="font-mono"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bot Username"
            type="text"
            value={settings.bot_username || ""}
            onChange={(e) =>
              onChange({
                ...settings,
                bot_username: e.target.value.replace("@", ""),
              })
            }
            placeholder="exam_bot"
            className="font-mono"
          />

          <div className="relative">
            <Input
              label="Webhook URL"
              type="url"
              value={settings.webhook_url || ""}
              onChange={(e) =>
                onChange({ ...settings, webhook_url: e.target.value })
              }
              placeholder="https://example.com/api/v1/telegram/webhook"
              className="font-mono"
            />
            {settings.webhook_url && (
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="absolute right-0 top-0 inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={loading}
            className="shadow-xs"
          >
            Save Credentials
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSetWebhook}
              disabled={webhookLoading || !settings.webhook_url}
              className="shadow-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Register Webhook</span>
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onDeleteWebhook}
              disabled={webhookLoading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Webhook</span>
            </Button>
          </div>
        </div>
      </form>

      <div className="glass-panel rounded-3xl p-6 border border-neutral-200/80 dark:border-white/10 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-white/5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Webhook Diagnostics
          </h3>
          <IconButton
            type="button"
            onClick={onRefreshInfo}
            variant="ghost"
            size="sm"
            title="Refresh diagnostics"
            aria-label="Refresh diagnostics"
            disabled={webhookLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${webhookLoading ? "animate-spin" : ""}`} />
          </IconButton>
        </div>

        {webhookInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5 space-y-1">
              <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] font-medium">
                Registered URL
              </span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 font-medium break-all block text-xs">
                {webhookInfo.url || "None"}
              </span>
            </div>

            <div className="p-4 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5 space-y-1">
              <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] font-medium">
                Pending Updates
              </span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 font-bold text-sm">
                {webhookInfo.pending_update_count}
              </span>
            </div>

            <div className="p-4 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5 space-y-1">
              <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] font-medium">
                SSL Certificate
              </span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {webhookInfo.has_custom_certificate ? "Custom Self-Signed" : "Standard Authority CA"}
              </span>
            </div>

            <div className="p-4 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5 space-y-1">
              <span className="text-neutral-500 dark:text-neutral-400 block text-[11px] font-medium">
                Max Connections
              </span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 font-bold text-xs">
                {webhookInfo.max_connections ?? 40}
              </span>
            </div>

            {webhookInfo.last_error_message && (
              <div className="sm:col-span-2 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Webhook Error</span>
                  {webhookInfo.last_error_date && (
                    <span className="text-[11px] font-normal text-rose-500 ml-auto">
                      {new Date(webhookInfo.last_error_date * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs bg-rose-500/10 p-2.5 rounded-xl">
                  {webhookInfo.last_error_message}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
            <p>No diagnostics data recorded.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefreshInfo}
              disabled={webhookLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${webhookLoading ? "animate-spin" : ""}`} />
              <span>Query Diagnostics</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
