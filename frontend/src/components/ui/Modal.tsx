"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  overflowVisible?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  overflowVisible = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${maxWidthStyles} ${
          overflowVisible ? "" : "max-h-[90vh] flex flex-col"
        } rounded-3xl bg-white dark:bg-[#121722] border border-neutral-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl shadow-black/40 z-10 animate-in zoom-in-95 duration-200 my-auto`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200/50 dark:border-white/10 pb-3.5 mb-4 shrink-0">
          <div>
            <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h3>
            {description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-500/10 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 active:scale-95 transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={overflowVisible ? "overflow-visible" : "overflow-y-auto pr-0.5"}>{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
