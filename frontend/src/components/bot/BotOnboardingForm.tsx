"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Eye, EyeOff, ArrowDown, Save, Lock, Trash2, ShieldCheck } from "lucide-react";
import { BotSetting } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";

interface OnboardingOption {
  label: string;
  value: string;
  next_step: OnboardingStep | null;
  is_active?: boolean;
}

interface OnboardingStep {
  id: string;
  label: string;
  options: OnboardingOption[];
}

interface OnboardingUsage {
  used_step_ids?: string[];
  used_option_values?: string[];
}

interface BotOnboardingFormProps {
  settings: BotSetting | null;
  usage?: OnboardingUsage;
  loading: boolean;
  onChange: (updated: BotSetting) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function extractSlug(label: string): string {
  const raw = (label || "").trim();
  const words = raw.split(/[\s\-_/\\,.]+/).filter(Boolean);
  const lastWord = words.length > 0 ? words[words.length - 1] : "";
  const cleanSlug = lastWord.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanSlug || "item";
}

export function updateIdWithSlug(
  currentId: string,
  newLabel: string,
  existingIds: Set<string>
): string {
  const prefix = extractSlug(newLabel);
  const parts = (currentId || "").split("_");
  let rand = parts.length > 1 ? parts[parts.length - 1] : "";
  if (!rand || rand.length < 4) {
    rand = Math.random().toString(36).substring(2, 9);
  }

  let candidate = `${prefix}_${rand}`;
  let attempts = 0;
  while (existingIds.has(candidate) && attempts < 100) {
    rand = Math.random().toString(36).substring(2, 9);
    candidate = `${prefix}_${rand}`;
    attempts++;
  }
  return candidate;
}

export function collectAllIds(steps: OnboardingStep[]): Set<string> {
  const ids = new Set<string>();
  const walk = (step: OnboardingStep) => {
    if (!step) return;
    if (step.id) ids.add(step.id);
    for (const opt of step.options || []) {
      if (opt.value) ids.add(opt.value);
      if (opt.next_step) walk(opt.next_step);
    }
  };
  for (const s of steps) walk(s);
  return ids;
}

export function BotOnboardingForm({
  settings,
  usage,
  loading,
  onChange,
  onSubmit,
}: BotOnboardingFormProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  const usedStepIdsSet = useMemo(
    () => new Set(usage?.used_step_ids || []),
    [usage?.used_step_ids]
  );
  const usedOptionValuesSet = useMemo(
    () => new Set(usage?.used_option_values || []),
    [usage?.used_option_values]
  );

  const isOptionLocked = (opt: OnboardingOption): boolean => {
    if (opt.value && usedOptionValuesSet.has(opt.value)) return true;
    if (opt.next_step && isStepLocked(opt.next_step)) return true;
    return false;
  };

  const isStepLocked = (step: OnboardingStep): boolean => {
    if (step.id && usedStepIdsSet.has(step.id)) return true;
    if (step.options && step.options.some((o) => isOptionLocked(o))) return true;
    return false;
  };

  useEffect(() => {
    if (settings?.onboarding_config) {
      try {
        const parsed =
          typeof settings.onboarding_config === "string"
            ? JSON.parse(settings.onboarding_config)
            : settings.onboarding_config;
        const list = Array.isArray(parsed) ? parsed : parsed?.steps || [];
        if (Array.isArray(list)) {
          setSteps(list);
          return;
        }
      } catch { }
    }
    setSteps([]);
  }, [settings?.onboarding_config]);

  const updateConfig = (newSteps: OnboardingStep[]) => {
    setSteps(newSteps);
    if (settings) {
      onChange({
        ...settings,
        onboarding_config: JSON.stringify({ steps: newSteps }),
      });
    }
  };

  const handleToggle = (enabled: boolean) => {
    if (settings) {
      onChange({
        ...settings,
        onboarding_enabled: enabled,
      });
    }
  };

  const addRootStep = () => {
    const label = "New Question";
    const allIds = collectAllIds(steps);
    const newId = updateIdWithSlug("", label, allIds);
    const newStep: OnboardingStep = {
      id: newId,
      label,
      options: [],
    };
    updateConfig([...steps, newStep]);
  };

  const renderStep = (
    step: OnboardingStep,
    onChangeStep: (newStep: OnboardingStep) => void,
    onDeleteStep?: () => void
  ) => {
    const stepLocked = isStepLocked(step);

    const handleStepLabelChange = (newLabel: string) => {
      if (stepLocked) return;
      const allIds = collectAllIds(steps);
      allIds.delete(step.id);
      const newId = updateIdWithSlug(step.id, newLabel, allIds);
      onChangeStep({ ...step, label: newLabel, id: newId });
    };

    const addOption = () => {
      const label = "New Option";
      const allIds = collectAllIds(steps);
      const value = updateIdWithSlug("", label, allIds);
      const newOption: OnboardingOption = {
        label,
        value,
        next_step: null,
        is_active: true,
      };
      onChangeStep({ ...step, options: [...step.options, newOption] });
    };

    const handleOptionLabelChange = (originalIdx: number, newLabel: string) => {
      const opt = step.options[originalIdx];
      if (!opt || isOptionLocked(opt)) return;
      const allIds = collectAllIds(steps);
      allIds.delete(opt.value);
      const newValue = updateIdWithSlug(opt.value, newLabel, allIds);
      const newOpts = [...step.options];
      newOpts[originalIdx] = {
        ...opt,
        label: newLabel,
        value: newValue,
      };
      onChangeStep({ ...step, options: newOpts });
    };

    const updateOptionAt = (originalIdx: number, updatedOpt: OnboardingOption) => {
      const newOpts = [...step.options];
      newOpts[originalIdx] = updatedOpt;
      onChangeStep({ ...step, options: newOpts });
    };

    const deleteOptionAt = (originalIdx: number) => {
      const newOpts = step.options.filter((_, idx) => idx !== originalIdx);
      onChangeStep({ ...step, options: newOpts });
    };

    const toggleOptionActiveAt = (originalIdx: number) => {
      const newOpts = [...step.options];
      const currentActive = newOpts[originalIdx]?.is_active !== false;
      newOpts[originalIdx] = {
        ...newOpts[originalIdx],
        is_active: !currentActive,
      };
      onChangeStep({ ...step, options: newOpts });
    };

    const activeList = step.options
      .map((opt, idx) => ({ opt, originalIdx: idx }))
      .filter(({ opt }) => opt.is_active !== false);

    const inactiveList = step.options
      .map((opt, idx) => ({ opt, originalIdx: idx }))
      .filter(({ opt }) => opt.is_active === false);

    return (
      <div
        className={`border rounded-2xl p-4 space-y-4 shadow-xs transition-colors ${stepLocked
          ? "border-amber-400/40 bg-amber-500/5 dark:bg-amber-500/5 dark:border-amber-400/20"
          : "border-neutral-200/80 dark:border-white/10 bg-white/60 dark:bg-neutral-900/40"
          }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={step.label}
              onChange={(e) => handleStepLabelChange(e.target.value)}
              disabled={stepLocked}
              placeholder="E.g. Select your Batch"
              className={stepLocked ? "opacity-90 font-medium cursor-not-allowed" : ""}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {stepLocked ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                <Lock className="w-3.5 h-3.5" />
                <span>Locked (Linked to Users)</span>
              </div>
            ) : (
              <div className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl text-[11px] font-mono text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5 select-none">
                ID: {step.id}
              </div>
            )}

            {!stepLocked && onDeleteStep && (
              <IconButton
                type="button"
                variant="danger"
                size="sm"
                onClick={onDeleteStep}
                title="Delete Unlinked Question Step"
                aria-label="Delete Question Step"
              >
                <Trash2 />
              </IconButton>
            )}
          </div>
        </div>

        <div className="space-y-3 pl-4 border-l-2 border-neutral-200/60 dark:border-white/10">
          <div className="space-y-2">
            {activeList.map(({ opt, originalIdx }) => {
              const optLocked = isOptionLocked(opt);
              return (
                <div key={originalIdx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={opt.label}
                        onChange={(e) =>
                          handleOptionLabelChange(originalIdx, e.target.value)
                        }
                        disabled={optLocked}
                        placeholder="Option Label (e.g. SSC 2026)"
                        className={optLocked ? "opacity-90 font-medium cursor-not-allowed" : ""}
                      />
                    </div>
                    <div className="w-36 shrink-0">
                      <Input
                        value={opt.value}
                        disabled
                        className="font-mono text-xs opacity-60"
                      />
                    </div>
                    {optLocked && (
                      <div
                        title="Option locked: linked to registered candidates"
                        className="p-1.5 text-amber-600 dark:text-amber-400 shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {!opt.next_step && (
                      <IconButton
                        type="button"
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          const subLabel = "Follow-up Question";
                          const allIds = collectAllIds(steps);
                          const subId = updateIdWithSlug("", subLabel, allIds);
                          updateOptionAt(originalIdx, {
                            ...opt,
                            next_step: {
                              id: subId,
                              label: subLabel,
                              options: [],
                            },
                          });
                        }}
                        title="Add follow-up step"
                        aria-label="Add follow-up step"
                      >
                        <ArrowDown />
                      </IconButton>
                    )}
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOptionActiveAt(originalIdx)}
                      title="Deactivate Option (Hide from Bot)"
                      aria-label="Deactivate Option"
                      className="text-neutral-500 hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      <Eye />
                    </IconButton>
                    {!optLocked && (
                      <IconButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => deleteOptionAt(originalIdx)}
                        title="Delete Unlinked Option"
                        aria-label="Delete Option"
                      >
                        <Trash2 />
                      </IconButton>
                    )}
                  </div>

                  {opt.next_step && (
                    <div className="pl-6 pt-2">
                      {renderStep(
                        opt.next_step,
                        (newSubStep) =>
                          updateOptionAt(originalIdx, {
                            ...opt,
                            next_step: newSubStep,
                          }),
                        !isStepLocked(opt.next_step)
                          ? () =>
                            updateOptionAt(originalIdx, {
                              ...opt,
                              next_step: null,
                            })
                          : undefined
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="text-indigo-600 dark:text-indigo-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Option</span>
            </Button>
          </div>

          {inactiveList.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-neutral-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Inactive Options ({inactiveList.length})</span>
                </div>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  Preserved for candidate history
                </span>
              </div>

              <div className="space-y-2">
                {inactiveList.map(({ opt, originalIdx }) => {
                  const optLocked = isOptionLocked(opt);
                  return (
                    <div
                      key={originalIdx}
                      className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-300/60 dark:border-amber-500/20 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            value={opt.label}
                            onChange={(e) =>
                              handleOptionLabelChange(originalIdx, e.target.value)
                            }
                            disabled={optLocked}
                            placeholder="Option Label"
                            className="opacity-75"
                          />
                        </div>
                        <div className="w-36 shrink-0">
                          <Input
                            value={opt.value}
                            disabled
                            className="font-mono text-xs opacity-50"
                          />
                        </div>
                        {optLocked && (
                          <div
                            title="Option locked: linked to registered candidates"
                            className="p-1.5 text-amber-600 dark:text-amber-400 shrink-0"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <IconButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleOptionActiveAt(originalIdx)}
                          title="Reactivate Option"
                          aria-label="Reactivate Option"
                          className="text-amber-600 dark:text-amber-400"
                        >
                          <EyeOff />
                        </IconButton>
                        {!optLocked && (
                          <IconButton
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => deleteOptionAt(originalIdx)}
                            title="Delete Unlinked Option"
                            aria-label="Delete Option"
                          >
                            <Trash2 />
                          </IconButton>
                        )}
                      </div>

                      {opt.next_step && (
                        <div className="pl-6 pt-2">
                          {renderStep(
                            opt.next_step,
                            (newSubStep) =>
                              updateOptionAt(originalIdx, {
                                ...opt,
                                next_step: newSubStep,
                              }),
                            !isStepLocked(opt.next_step)
                              ? () =>
                                updateOptionAt(originalIdx, {
                                  ...opt,
                                  next_step: null,
                                })
                              : undefined
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Mandatory Onboarding
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Require users to fill out a profile before using the bot
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={!!settings?.onboarding_enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={loading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-neutral-900 dark:peer-checked:bg-white" />
          </label>
        </div>

        {settings?.onboarding_enabled && (
          <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Hierarchical onboarding tree.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>

            {steps.length === 0 ? (
              <button
                type="button"
                onClick={addRootStep}
                className="w-full py-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <Plus className="w-6 h-6 mb-2" />
                <span className="font-medium">Create First Question</span>
              </button>
            ) : (
              <div className="space-y-4">
                {steps.map((step, sIdx) => (
                  <div key={step.id || sIdx}>
                    {renderStep(
                      step,
                      (newStep) => {
                        const nextSteps = [...steps];
                        nextSteps[sIdx] = newStep;
                        updateConfig(nextSteps);
                      },
                      !isStepLocked(step)
                        ? () => {
                          const nextSteps = steps.filter((_, i) => i !== sIdx);
                          updateConfig(nextSteps);
                        }
                        : undefined
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addRootStep}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Root Question
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} className="gap-2 rounded-xl">
            <Save className="w-4 h-4" /> Save Configuration
          </Button>
        </div>
      </div>
    </form>
  );
}
