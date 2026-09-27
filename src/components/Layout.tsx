'use client';

import { ReactNode } from "react";
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
      {showTopbar && <Topbar />}
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      <CompareBar />
      <CompareModal />
    </div>
  );
}
 