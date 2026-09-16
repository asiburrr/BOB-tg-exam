"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = () => {
    if (theme === "auto") {
      return <Monitor className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />;
    }
    return resolvedTheme === "dark" ? (
      <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
    ) : (
      <Sun className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors flex items-center justify-center border border-neutral-200 dark:border-neutral-800"
        title={`Theme: ${theme}`}
        aria-label="Toggle theme mode"
      >
        {getIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1 z-50 text-xs">
          <button
            type="button"
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
              theme === "light" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
              theme === "dark" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("auto");
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
              theme === "auto" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Auto (System)</span>
          </button>
        </div>
      )}
    </div>
  );
}
