"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const isBusy = loading || isLoading;

  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] whitespace-nowrap gap-1.5";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  }[size];

  const variantStyles = {
    primary:
      "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-md",
    secondary:
      "bg-neutral-500/10 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-500/15 border border-neutral-200/50 dark:border-white/10 backdrop-blur-md",
    outline:
      "border border-neutral-200/80 dark:border-white/15 bg-white/40 dark:bg-white/5 text-neutral-800 dark:text-neutral-200 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-md",
    danger:
      "bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20",
    ghost:
      "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-500/10",
  }[variant];

  return (
    <button
      type={type}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isBusy}
      {...props}
    >
      {isBusy ? (
        <span className="inline-flex items-center gap-1.5">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
