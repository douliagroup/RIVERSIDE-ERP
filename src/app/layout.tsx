"use client";

import "./globals.css";
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { cn } from "../lib/utils";
import { AuthProvider } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { Menu, ChevronLeft } from "lucide-react";

import { Toaster as SonnerToaster } from "sonner";
import { Toaster as HotToaster } from "react-hot-toast";

import { motion, AnimatePresence } from "motion/react";
import ChatInterneWidget from "../components/ChatInterneWidget";

import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();

  return (
    <html lang="fr" className={cn("h-full", inter.variable, spaceGrotesk.variable)}>
      <AuthProvider>
        <body className="flex h-screen m-0 bg-slate-50 font-sans antialiased overflow-hidden selection:bg-riverside-red/10 selection:text-riverside-red">
          {/* Bouton Menu Hamburger Flottant (Toujours visible si Sidebar rétractée ou mobile) */}
          {pathname !== '/login' && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="fixed top-4 left-4 z-[60] w-10 h-10 bg-riverside-red text-white rounded-xl shadow-lg shadow-red-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all md:hidden"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Menu latéral fixe avec état retractable */}
          {pathname !== '/login' && (
            <aside 
              className={cn(
                "h-screen border-r border-slate-200 bg-white flex-shrink-0 transition-all duration-300 ease-in-out z-50 hidden md:block",
                isCollapsed ? "w-20" : "w-[240px]"
              )}
            >
              <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            </aside>
          )}

          {/* Sidebar Mobile (en overlay) */}
          <AnimatePresence>
            {pathname !== '/login' && !isCollapsed && (
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                className="fixed inset-y-0 left-0 w-[240px] bg-white z-[70] shadow-2xl md:hidden"
              >
                <div className="h-full relative">
                  <Sidebar isCollapsed={false} setIsCollapsed={setIsCollapsed} />
                  <button 
                    onClick={() => setIsCollapsed(true)}
                    className="absolute top-4 right-[-40px] w-10 h-10 bg-riverside-red text-white rounded-r-xl flex items-center justify-center shadow-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay pour mobile */}
          {pathname !== '/login' && !isCollapsed && (
            <div 
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[65] md:hidden" 
              onClick={() => setIsCollapsed(true)}
            />
          )}
          
          {/* Zone de contenu principale */}
          <main className="flex-1 h-screen overflow-hidden bg-slate-50 relative flex flex-col">
            <SonnerToaster position="top-right" expand={true} richColors />
            <HotToaster position="top-center" />
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
            <ChatInterneWidget />
          </main>
        </body>
      </AuthProvider>
    </html>
  );
}
