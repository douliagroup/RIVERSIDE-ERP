"use client";

import "./globals.css";
import React, { useState } from "react";
import Sidebar from "@/src/components/Sidebar";
import { cn } from "@/src/lib/utils";
import { AuthProvider } from "@/src/context/AuthContext";
import { usePathname } from "next/navigation";

import { motion, AnimatePresence } from "motion/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <html lang="fr" className="h-full">
      <AuthProvider>
        <body className="flex h-screen m-0 bg-slate-50 font-sans antialiased overflow-hidden selection:bg-riverside-red/10 selection:text-riverside-red">
          {/* Menu latéral fixe avec état retractable */}
          {pathname !== '/login' && pathname !== '/' && (
            <aside 
              className={cn(
                "h-screen border-r border-slate-200 bg-white flex-shrink-0 transition-all duration-300 ease-in-out z-50",
                isCollapsed ? "w-20" : "w-[240px]"
              )}
            >
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            </aside>
          )}
          
          {/* Zone de contenu principale */}
          <main className="flex-1 h-screen overflow-hidden bg-slate-50 relative flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-hide">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn(
                    "max-w-[1600px] mx-auto min-h-screen",
                    pathname === '/login' ? "p-0" : "p-6 md:p-10"
                  )}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </body>
      </AuthProvider>
    </html>
  );
}
