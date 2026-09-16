import React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/70 backdrop-blur-xl shadow-sm shadow-neutral-900/5 transition-all text-neutral-900 dark:text-neutral-100",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight text-neutral-900 dark:text-white", className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed", className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0 border-t border-neutral-100 dark:border-neutral-800/60 mt-4", className)}
      {...props}
    />
  )
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  variant?: "emerald" | "indigo" | "amber" | "violet" | "rose" | "sky" | "neutral";
  description?: string;
  badge?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  emerald: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  indigo: "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  amber: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  violet: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  rose: "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  sky: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
  neutral: "bg-neutral-500/10 dark:bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-200/80 dark:border-white/10",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = "indigo",
  description,
  badge,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-[22px] p-4 sm:p-5 flex items-center justify-between gap-3 bg-white/70 dark:bg-[#10141d]/90 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] shadow-sm hover:border-neutral-300 dark:hover:border-white/15 transition-all",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate block">
            {label}
          </span>
          {badge}
        </div>
        <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1 truncate">
          {value}
        </div>
        {description && (
          <div className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
            {description}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={cn(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border",
            variantStyles[variant] || variantStyles.indigo
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  )
}
