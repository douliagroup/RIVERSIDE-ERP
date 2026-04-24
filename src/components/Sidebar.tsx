"use client";

import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Wallet, 
  LogOut, 
  PlusCircle,
  Activity
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";

import Image from "next/image";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", active: true },
  { icon: Users, label: "Patients", href: "/patients", active: false },
  { icon: ShieldCheck, label: "Administration", href: "/admin", active: false },
  { icon: Wallet, label: "Caisse", href: "/caisse", active: false },
  { icon: Activity, label: "Command Center", href: "/patron/dashboard", active: false },
];

export function Sidebar() {
  return (
    <aside className={cn(
      "w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-row lg:flex-col shrink-0 z-50",
      "lg:sticky lg:top-0 lg:h-screen"
    )}>
      {/* Brand */}
      <div className="p-4 lg:p-8 flex items-center gap-3 border-r lg:border-r-0 border-slate-100">
        <div className="relative w-8 h-8 lg:w-10 lg:h-10 flex-shrink-0">
          <Image 
            src="https://i.postimg.cc/jj9x2wr9/92953051_100850928268975_2573263542966812672_n.png"
            alt="Riverside Logo"
            fill
            className="object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="leading-none hidden sm:block">
          <p className="font-bold text-[10px] lg:text-sm tracking-tight text-slate-900">RIVERSIDE</p>
          <p className="text-[8px] lg:text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Medical Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible px-2 lg:px-4 py-2 lg:py-4 gap-1">
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-200 group text-xs lg:text-sm whitespace-nowrap",
              item.active 
                ? "bg-red-50 text-riverside-red font-semibold" 
                : "text-slate-500 hover:bg-slate-50 font-medium"
            )}
          >
            <item.icon 
              size={18} 
              className={cn(
                "transition-colors",
                item.active ? "text-riverside-red" : "text-slate-400 group-hover:text-slate-600"
              )} 
            />
            <span className="hidden md:inline">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Footer / User - Hidden on mobile for space */}
      <div className="p-4 mt-auto hidden lg:block">
        <div className="p-4 rounded-2xl bg-slate-100 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-slate-300 flex-shrink-0 flex items-center justify-center text-slate-500 text-xs font-bold">
            DR
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">Dr. Samuel Eto'o</p>
            <p className="text-[10px] text-slate-500 truncate">Chef de Clinique</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
