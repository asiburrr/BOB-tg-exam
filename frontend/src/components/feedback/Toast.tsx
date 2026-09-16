"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: "success" | "error" | "info", message: any, title?: string) => {
      const cleanMessage =
        typeof message === "string"
          ? message
          : message?.message
          ? String(message.message)
          : typeof message === "object"
          ? JSON.stringify(message)
          : String(message);

      setToasts((prev) => {
        if (prev.some((t) => t.message === cleanMessage && t.type === type)) {
          return prev;
        }
        const id = Math.random().toString(36).substring(2, 9);
        setTimeout(() => {
          removeToast(id);
        }, 4000);
        return [...prev.slice(-4), { id, type, message: cleanMessage, title }];
      });
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, title?: string) => addToast("success", msg, title),
      error: (msg: string, title?: string) => addToast("error", msg, title),
      info: (msg: string, title?: string) => addToast("info", msg, title),
    }),
    [addToast]
  );

  const contextValue = useMemo(() => ({ toast }), [toast]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-xl bg-white/95 dark:bg-neutral-900/95 border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all animate-in slide-in-from-bottom-5 fade-in duration-200"
            )}
          >
            <div className="pt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0 space-y-0.5">
              {t.title && <h6 className="text-xs font-semibold">{t.title}</h6>}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed break-words">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context.toast;
}
