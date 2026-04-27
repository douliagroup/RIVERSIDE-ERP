"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ShieldCheck, 
  Activity,
  LogOut,
  ChevronLeft,
  Menu,
  FileText,
  Megaphone,
  Package,
  Stethoscope,
  Calendar,
  Pill,
  MessageCircle
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/context/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ['patron', 'comptable', 'major', 'caissier', 'personnel', 'communication', 'accueil'] },
  { icon: Users, label: "Admission", href: "/patients", roles: ['patron', 'major', 'caissier', 'accueil'] },
  { icon: Stethoscope, label: "Médical", href: "/medical", roles: ['patron', 'personnel', 'major'] },
  { icon: Calendar, label: "Planning", href: "/planning", roles: ['patron', 'personnel', 'major', 'accueil'] },
  { icon: Pill, label: "Pharmacie", href: "/pharmacie", roles: ['patron', 'personnel', 'major', 'comptable'] },
  { icon: Wallet, label: "Trésorerie", href: "/tresorerie", roles: ['patron', 'caissier'] },
  { icon: ShieldCheck, label: "Administration", href: "/administration", roles: ['patron', 'major'] },
  { icon: Package, label: "Inventaire", href: "/admin/stocks", roles: ['patron', 'major'] },
  { icon: Activity, label: "Patron (Insight)", href: "/patron", roles: ['patron'] },
  { icon: FileText, label: "Comptabilité", href: "/comptable", roles: ['patron', 'comptable'] },
  { icon: Megaphone, label: "Community", href: "/cm", roles: ['patron', 'comptable'] },
  { icon: MessageCircle, label: "DOULIA Love", href: "/doulia-love", roles: ['patron', 'communication'] },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user, userRole, setUserRole, signOut } = useAuth();

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-riverside-red hover:border-riverside-red/30 shadow-sm transition-all z-50"
      >
        {isCollapsed ? <Menu size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Role Switcher (Mock for Demo - Visible only if NOT logged in) */}
      {!isCollapsed && !user && (
        <div className="absolute top-2 left-6 right-6 flex items-center justify-center gap-1 overflow-x-auto py-1 scrollbar-hide">
            <button 
              onClick={() => setUserRole('patron')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'patron' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}
            >
              Patron
            </button>
            <button 
              onClick={() => setUserRole('comptable')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'comptable' ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400")}
            >
              Comptable
            </button>
            <button 
              onClick={() => setUserRole('major')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'major' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}
            >
              Major
            </button>
            <button 
              onClick={() => setUserRole('caissier')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'caissier' ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-400")}
            >
              Caisse
            </button>
            <button 
              onClick={() => setUserRole('personnel')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'personnel' ? "bg-slate-400 text-white" : "bg-slate-100 text-slate-400")}
            >
              Staff
            </button>
            <button 
              onClick={() => setUserRole('communication')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'communication' ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-400")}
            >
              Com
            </button>
            <button 
              onClick={() => setUserRole('accueil')}
              className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all whitespace-nowrap", userRole === 'accueil' ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-400")}
            >
              Accueil
            </button>
        </div>
      )}

      {/* Logo & Brand */}
      <div className={cn(
        "px-6 py-10 transition-all duration-300",
        isCollapsed ? "px-4 mt-4" : "px-6"
      )}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Image 
              src="https://i.postimg.cc/jj9x2wr9/92953051_100850928268975_2573263542966812672_n.png" 
              alt="Logo Riverside" 
              width={56}
              height={56}
              referrerPolicy="no-referrer"
              className={cn(
                "transition-all duration-500 rounded-xl",
                isCollapsed ? "w-10 h-10 shadow-none" : "w-14 h-14 shadow-xl shadow-red-100"
              )}
            />
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
              />
            )}
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="text-[22px] font-black text-slate-950 leading-none uppercase tracking-[0.2em] font-sans italic">RIVERSIDE</span>
                <span className="text-[13px] font-black text-riverside-red uppercase tracking-[0.1em] mt-2 pr-1 font-sans">Medical Center</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.label} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all relative group overflow-hidden",
                isActive 
                  ? "bg-riverside-red text-white shadow-lg shadow-red-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-riverside-red"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon size={isActive ? 22 : 20} className={cn(
                  "relative z-10 transition-colors",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-riverside-red"
                )} />
                {!isCollapsed && (
                  <span className="text-sm font-bold relative z-10 whitespace-nowrap">{item.label}</span>
                )}
                
                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="fixed left-20 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Info / Footer */}
      <div className="p-4 mt-auto space-y-2">
        {user && !isCollapsed && (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Identifié</p>
             <p className="text-[10px] font-bold text-slate-900 truncate tracking-tight">{user.email}</p>
             <span className="text-[7px] font-black text-riverside-red bg-red-50 px-2 py-0.5 rounded-full inline-block w-fit mt-1 uppercase">{userRole}</span>
          </div>
        )}
        
        <button 
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-slate-400 hover:bg-red-50 hover:text-riverside-red border border-transparent hover:border-red-100 group",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut size={18} className="transition-transform group-hover:translate-x-0.5" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Déconnexion</span>}
        </button>

        {!isCollapsed && (
          <div className="mt-4 text-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] italic">© 2026 Riverside</p>
          </div>
        )}
      </div>
    </div>
  );
}
