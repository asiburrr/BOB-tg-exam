"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export function Checkbox({
  label,
  description,
  error,
  checked,
  disabled,
  className = "",
  id,
  onChange,
  ...props
}: CheckboxProps) {
  const checkboxId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="space-y-1 text-left">
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex items-start gap-2.5 select-none cursor-pointer group",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5 shrink-0">
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              "w-4 h-4 rounded-md border transition-all flex items-center justify-center",
              checked
                ? "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white shadow-xs"
                : "border-neutral-300 dark:border-white/20 bg-white/60 dark:bg-white/5 group-hover:border-neutral-400 dark:group-hover:border-white/40",
              error && "border-rose-500"
            )}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="min-w-0">
            {label && (
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                {label}
              </span>
            )}
            {description && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                {description}
              </p>
            )}
          </div>
        )}
      </label>
      {error && <p className="text-[11px] text-rose-500 pl-6.5">{error}</p>}
    </div>
  );
}
