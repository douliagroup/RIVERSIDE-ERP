"use client";

import "./globals.css";
import React, { useState } from "react";
import Sidebar from "@/src/components/Sidebar";
import { cn } from "@/src/lib/utils";
import { AuthProvider } from "@/src/context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="fr">
      <AuthProvider>
        <body className="flex h-screen m-0 bg-slate-50 font-sans antialiased overflow-hidden">
          {/* Menu latéral fixe avec état retractable */}
          <aside 
            className={cn(
              "h-full border-r border-slate-200 bg-white flex-shrink-0 transition-all duration-300 ease-in-out z-50",
              isCollapsed ? "w-20" : "w-[240px]"
            )}
          >
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </aside>
          
          {/* Zone de contenu principale */}
          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scroll-smooth bg-gradient-to-br from-slate-50 to-white">
            <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
              {children}
            </div>
          </main>
        </body>
      </AuthProvider>
    </html>
  );
}
