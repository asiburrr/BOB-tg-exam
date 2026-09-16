import React, { useMemo } from "react";
import { Filter, ChevronRight, X } from "lucide-react";
import { BotSetting } from "@/lib/types";

interface OnboardingOptionItem {
  label: string;
  value: string;
  id?: string;
  next_step: OnboardingStepItem | null;
  is_active?: boolean;
}

interface OnboardingStepItem {
  id: string;
  label: string;
  options: OnboardingOptionItem[];
}

interface OnboardingFilterBarProps {
  settings: BotSetting | null | undefined;
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
}

export function OnboardingFilterBar({
  settings,
  filters,
  onChange,
}: OnboardingFilterBarProps) {
  const rootSteps: OnboardingStepItem[] = useMemo(() => {
    if (!settings?.onboarding_enabled || !settings?.onboarding_config) return [];
    try {
      const config = JSON.parse(settings.onboarding_config);
      return Array.isArray(config) ? config : config.steps || [];
    } catch {
      return [];
    }
  }, [settings]);

  const visibleSteps = useMemo(() => {
    if (rootSteps.length === 0) return [];
    const list: OnboardingStepItem[] = [];

    const walk = (currentStep: OnboardingStepItem) => {
      if (!currentStep) return;
      list.push(currentStep);

      const selectedVal = filters[currentStep.id];
      if (selectedVal) {
        const selectedOpt = currentStep.options?.find(
          (opt) => opt.value === selectedVal || opt.id === selectedVal
        );
        if (selectedOpt && selectedOpt.next_step) {
          walk(selectedOpt.next_step);
        }
      }
    };

    for (const root of rootSteps) {
      walk(root);
    }

    return list;
  }, [rootSteps, filters]);

  const collectDescendants = (step: OnboardingStepItem, set = new Set<string>()) => {
    for (const opt of step.options || []) {
      if (opt.next_step) {
        if (opt.next_step.id) set.add(opt.next_step.id);
        collectDescendants(opt.next_step, set);
      }
    }
    return set;
  };

  const handleStepChange = (step: OnboardingStepItem, value: string) => {
    const descendants = collectDescendants(step);
    const newFilters = { ...filters };
    for (const descId of descendants) {
      delete newFilters[descId];
    }
    if (value) {
      newFilters[step.id] = value;
    } else {
      delete newFilters[step.id];
    }
    onChange(newFilters);
  };

  if (visibleSteps.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-500/5 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/60 dark:border-white/5">
      <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Filter className="w-3.5 h-3.5" />
        <span>Filters:</span>
      </div>

      {visibleSteps.map((step, idx) => {
        const isSelected = Boolean(filters[step.id]);
        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
            )}
            <select
              value={filters[step.id] || ""}
              onChange={(e) => handleStepChange(step, e.target.value)}
              className={`text-xs py-1.5 px-2.5 rounded-xl border transition-all focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white/20 ${
                isSelected
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white font-medium shadow-xs"
                  : "bg-white/80 dark:bg-neutral-900/80 border-neutral-200/80 dark:border-white/10 text-neutral-800 dark:text-neutral-200"
              }`}
            >
              <option value="" className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                Any {step.label}
              </option>
              {step.options
                ?.filter((opt) => opt.is_active !== false)
                .map((opt) => (
                  <option
                    key={opt.value || opt.id}
                    value={opt.value || opt.id}
                    className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {opt.label}
                  </option>
                ))}
              {step.options?.some((opt) => opt.is_active === false) && (
                <optgroup
                  label="Inactive / Archived"
                  className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 font-semibold"
                >
                  {step.options
                    ?.filter((opt) => opt.is_active === false)
                    .map((opt) => (
                      <option
                        key={opt.value || opt.id}
                        value={opt.value || opt.id}
                        className="bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                      >
                        {opt.label} (Inactive)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </React.Fragment>
        );
      })}

      {Object.keys(filters).length > 0 && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 hover:text-rose-500 px-2 py-1 transition-colors"
        >
          <X className="w-3 h-3" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}
