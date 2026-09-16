"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Menu, Clock, LogOut, Shield, User as UserIcon } from "lucide-react";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export function Navbar({ onOpenMobileMenu }: NavbarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const [timeString, setTimeString] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timePart = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const datePart = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      setTimeString(`${timePart} • ${datePart}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname === "/admin/questions/new") return "New Question";
    if (pathname === "/admin/questions/bulk") return "Bulk Question Entry";
    if (pathname.startsWith("/admin/questions/") && pathname.includes("/edit")) return "Edit Question";
    if (pathname === "/admin/questions") return "Question Bank";
    if (pathname.startsWith("/admin/categories")) return "Categories & Topics";
    if (pathname === "/admin/bot/community") return "Access & Community";
    if (pathname === "/admin/bot/limits") return "Limits & Quota";
    if (pathname === "/admin/bot/campaigns") return "Promotional Campaigns";
    if (pathname === "/admin/bot/users") return "Bot Users";
    if (pathname === "/admin/bot/sessions") return "Exam Sessions Audit";
    if (pathname === "/admin/bot/webhook") return "Webhook & API";
    if (pathname === "/admin/bot/broadcast") return "Promotional Broadcast";
    if (pathname === "/admin/bot/onboarding") return "User Onboarding";
    if (pathname === "/admin/bot") return "Flow Builder";
    if (pathname === "/admin/profile") return "My Profile";
    if (pathname.startsWith("/admin/users")) return "Administrators";
    if (pathname.startsWith("/admin/activity")) return "Activity Logs";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    return "Dashboard";
  };

  useEffect(() => {
    const title = getPageTitle();
    document.title = `${title} | BOB Exam System`;
  }, [pathname]);

  const initial = admin?.name ? admin.name.charAt(0).toUpperCase() : "A";

  return (
    <header className="sticky top-0 z-30 w-full h-14 border-b glass-nav flex items-center justify-between px-3 sm:px-6 transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-500/10 active:scale-95 transition-all shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate max-w-[160px] sm:max-w-none">
          {getPageTitle()}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {timeString && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono pr-2 bg-neutral-500/5 dark:bg-white/5 px-2.5 py-1 rounded-full border border-neutral-200/40 dark:border-white/5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{timeString}</span>
          </div>
        )}

        <ThemeToggle />

        {admin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 pl-1.5 rounded-full hover:bg-neutral-500/10 active:scale-95 transition-all border border-neutral-200/50 dark:border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center shadow-xs">
                {initial}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-2xl glass-dropdown py-1.5 z-50 text-xs shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-neutral-200/50 dark:border-white/10">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{admin.name}</div>
                  <div className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate font-mono mt-0.5">{admin.email}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    <Shield className="w-3 h-3" />
                    <span>{admin.role}</span>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    href="/admin/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-500/10 active:scale-[0.98] transition-all"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>My Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.98] transition-all border-t border-neutral-200/40 dark:border-white/5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
