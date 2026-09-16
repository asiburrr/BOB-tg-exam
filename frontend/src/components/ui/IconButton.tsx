"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type IconButtonVariant =
  | "ghost"
  | "secondary"
  | "primary"
  | "danger"
  | "warning"
  | "indigo"
  | "emerald";

export type IconButtonSize = "xs" | "sm" | "md" | "lg";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  rounded?: "lg" | "xl" | "2xl" | "full";
  href?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const IconButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  IconButtonProps
>(
  (
    {
      variant = "ghost",
      size = "sm",
      rounded = "xl",
      href,
      loading = false,
      icon,
      children,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none select-none active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    const sizeStyles: Record<IconButtonSize, string> = {
      xs: "w-6 h-6 p-1 text-xs [&>svg]:w-3 [&>svg]:h-3",
      sm: "w-7 h-7 p-1.5 text-xs [&>svg]:w-3.5 [&>svg]:h-3.5",
      md: "w-8 h-8 p-2 text-sm [&>svg]:w-4 [&>svg]:h-4",
      lg: "w-10 h-10 p-2.5 text-base [&>svg]:w-5 [&>svg]:h-5",
    };

    const roundedStyles = {
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      full: "rounded-full",
    }[rounded];

    const variantStyles: Record<IconButtonVariant, string> = {
      ghost:
        "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-500/10",
      secondary:
        "bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/15 border border-neutral-200/50 dark:border-white/10 backdrop-blur-md",
      primary:
        "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-sm",
      danger:
        "text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10",
      warning:
        "text-neutral-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10",
      indigo:
        "text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10",
      emerald:
        "text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10",
    };

    const combinedClasses = cn(
      baseStyles,
      sizeStyles[size],
      roundedStyles,
      variantStyles[variant],
      className
    );

    const content = loading ? (
      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
    ) : (
      icon || children
    );

    if (href && !disabled && !loading) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={combinedClasses}
          title={props.title}
          aria-label={props["aria-label"] || props.title}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        className={combinedClasses}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
