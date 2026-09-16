export interface OnboardingStepItem {
  id?: string;
  label?: string;
  options?: OnboardingOptionItem[];
}

export interface OnboardingOptionItem {
  label?: string;
  value?: string;
  id?: string;
  next_step?: OnboardingStepItem | null;
  is_active?: boolean;
}

export interface OnboardingParsedMeta {
  steps: OnboardingStepItem[];
  optionMap: Record<string, string>;
  stepMap: Record<string, string>;
}

export function parseOnboardingConfig(configJson?: string | null): OnboardingParsedMeta {
  const optionMap: Record<string, string> = {};
  const stepMap: Record<string, string> = {};
  if (!configJson) return { steps: [], optionMap, stepMap };

  try {
    const parsed = typeof configJson === "string" ? JSON.parse(configJson) : configJson;
    const steps: OnboardingStepItem[] = Array.isArray(parsed)
      ? parsed
      : (parsed?.steps || []);

    const walk = (step: OnboardingStepItem) => {
      if (!step) return;
      if (step.id && step.label) {
        stepMap[step.id] = step.label;
      }
      if (Array.isArray(step.options)) {
        for (const opt of step.options) {
          if (opt.value && opt.label) {
            optionMap[opt.value] = opt.label;
          }
          if (opt.id && opt.label) {
            optionMap[opt.id] = opt.label;
          }
          if (opt.next_step) {
            walk(opt.next_step);
          }
        }
      }
    };

    for (const s of steps) {
      walk(s);
    }

    return { steps, optionMap, stepMap };
  } catch {
    return { steps: [], optionMap, stepMap };
  }
}

export function resolveOnboardingPath(
  profileData?: string | null,
  configMeta?: OnboardingParsedMeta | string | null
): string[] {
  if (!profileData) return [];

  const meta: OnboardingParsedMeta =
    typeof configMeta === "object" && configMeta !== null && "optionMap" in configMeta
      ? configMeta
      : parseOnboardingConfig(typeof configMeta === "string" ? configMeta : null);

  const { steps, optionMap } = meta;

  let parsed: any = null;
  try {
    parsed = JSON.parse(profileData);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const consumedKeys = new Set<string>();
    const labels: string[] = [];

    const walkTree = (currentStep: OnboardingStepItem) => {
      if (!currentStep) return;
      let matchedOpt: OnboardingOptionItem | null = null;

      if (currentStep.id && currentStep.id in parsed) {
        const val = parsed[currentStep.id];
        consumedKeys.add(currentStep.id);
        matchedOpt =
          currentStep.options?.find(
            (o) => o.value === val || o.id === val || o.label === val
          ) || null;
        if (matchedOpt && matchedOpt.label) {
          labels.push(matchedOpt.label);
        } else if (val) {
          const strVal = String(val);
          labels.push(optionMap[strVal] || strVal);
        }
      } else {
        const availableVals = Object.entries(parsed)
          .filter(([k]) => !consumedKeys.has(k))
          .map(([k, v]) => ({ key: k, value: String(v) }));

        for (const item of availableVals) {
          const found = currentStep.options?.find(
            (o) => o.value === item.value || o.id === item.value || o.label === item.value
          );
          if (found) {
            matchedOpt = found;
            consumedKeys.add(item.key);
            if (found.label) labels.push(found.label);
            break;
          }
        }
      }

      if (matchedOpt && matchedOpt.next_step) {
        walkTree(matchedOpt.next_step);
      }
    };

    for (const rootStep of steps) {
      walkTree(rootStep);
    }

    for (const [key, val] of Object.entries(parsed)) {
      if (!consumedKeys.has(key)) {
        const strVal = String(val);
        labels.push(optionMap[strVal] || strVal);
      }
    }

    return labels.filter(Boolean);
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        const str = String(item);
        return optionMap[str] || str;
      })
      .filter(Boolean);
  }

  const rawStr = String(profileData).trim();
  if (rawStr.includes(">")) {
    return rawStr
      .split(">")
      .map((p) => {
        const trimmed = p.trim();
        return optionMap[trimmed] || trimmed;
      })
      .filter(Boolean);
  }

  if (rawStr.includes(",")) {
    return rawStr
      .split(",")
      .map((p) => {
        const trimmed = p.trim();
        return optionMap[trimmed] || trimmed;
      })
      .filter(Boolean);
  }

  return [optionMap[rawStr] || rawStr].filter(Boolean);
}

export function resolveOnboardingLabel(
  profileData?: string | null,
  configMeta?: OnboardingParsedMeta | string | null
): string {
  const path = resolveOnboardingPath(profileData, configMeta);
  return path.join(" > ");
}
