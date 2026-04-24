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
];

export function Sidebar() {
  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 transition-transform lg:translate-x-0 -translate-x-full",
      "bg-white border-r border-slate-200 flex flex-col"
    )}>
      {/* Brand */}
      <div className="p-8 flex items-center gap-3">
        <div className="relative w-10 h-10 flex-shrink-0">
          <Image 
            src="https://i.postimg.cc/jj9x2wr9/92953051_100850928268975_2573263542966812672_n.png"
            alt="Riverside Logo"
            fill
            className="object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="leading-none">
          <p className="font-bold text-sm tracking-tight text-slate-900">RIVERSIDE</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Medical Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm",
              item.active 
                ? "bg-red-50 text-riverside-red font-semibold" 
                : "text-slate-500 hover:bg-slate-50 font-medium"
            )}
          >
            <item.icon 
              size={20} 
              className={cn(
                "transition-colors",
                item.active ? "text-riverside-red" : "text-slate-400 group-hover:text-slate-600"
              )} 
            />
            {item.label}
          </a>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="p-6 mt-auto">
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
