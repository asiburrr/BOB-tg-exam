"use client";

import React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  helperText,
  leftIcon,
  options,
  placeholder,
  children,
  className = "",
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="space-y-1.5 w-full text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500 z-10">
            {leftIcon}
          </div>
        )}
        <select
          id={selectId}
          required={required}
          className={cn(
            "w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white/60 dark:bg-white/5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-neutral-900/80 transition-all appearance-none pr-10 cursor-pointer",
            leftIcon ? "pl-10" : "",
            error ? "border-rose-500 focus:ring-rose-500/20" : "",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500 z-10">
          <ChevronsUpDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{helperText}</p>
      )}
    </div>
  );
}
