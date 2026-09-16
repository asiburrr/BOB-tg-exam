"use client";

import React from "react";
import { LucideIcon, Bot } from "lucide-react";

interface BotPageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  botUsername?: string | null;
  webhookOk?: boolean;
  actions?: React.ReactNode;
}

export function BotPageHeader({
  title,
  description,
  icon: Icon,
  botUsername,
  webhookOk,
  actions,
}: BotPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
            <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{title}</span>
          </h1>

          {botUsername && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-white/10">
              <Bot className="w-3.5 h-3.5" />
              <span>@{botUsername}</span>
              {webhookOk !== undefined && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    webhookOk ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              )}
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
