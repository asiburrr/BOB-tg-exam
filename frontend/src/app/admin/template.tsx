"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-ios-enter">
      {children}
    </div>
  );
}
