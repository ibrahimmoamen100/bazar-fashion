'use client';

import { ReactNode, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Topbar } from "@/components/Topbar";
import { CompareBar } from "@/components/ProductCompare/CompareBar";
import { CompareModal } from "@/components/ProductCompare/CompareModal";

interface LayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  showTopbar?: boolean;
}

export function Layout({ children, showNavbar = true, showTopbar = true }: LayoutProps) {
  return (
    <div className="min-h-screen">
      {showTopbar && (
        <Suspense fallback={null}>
          <Topbar />
        </Suspense>
      )}
      {showNavbar && (
        <Suspense fallback={<div className="h-[76px] bg-white border-b border-gray-100 shadow-sm" />}>
          <Navbar />
        </Suspense>
      )}
      <main className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <CompareBar />
        <CompareModal />
      </Suspense>
    </div>
  );
}