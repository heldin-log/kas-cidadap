"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, WalletCards, LayoutDashboard, Bell, Sparkles, Menu, X, LogOut, MessageSquare } from "lucide-react"; // 1. Tambahkan MessageSquare di sini
import { Toaster, toast } from "sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Administrator");
  const [adminRole, setAdminRole] = useState("Administrator");
  const [adminInitials, setAdminInitials] = useState("AD");
  
  const pathname = usePathname();
  const router = useRouter();

  // Ambil nama dan role user dari Cookie secara dinamis dengan pengaman aman
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    const encodedName = getCookie("userName");
    if (encodedName) {
      const name = decodeURIComponent(encodedName);
      setAdminName(name);
      
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      setAdminInitials(initials || "AD");
    }

    const encodedRole = getCookie("userRole");
    if (encodedRole && encodedRole !== "undefined") {
      setAdminRole(decodeURIComponent(encodedRole));
    } else {
      setAdminRole("Administrator"); // Fallback aman jika role tidak terekam
    }
  }, []);

  // Fungsi Logout
  const handleLogout = () => {
    document.cookie = "isLoggedIn=; path=/; max-age=0";
    document.cookie = "userName=; path=/; max-age=0";
    document.cookie = "userRole=; path=/; max-age=0";
    
    toast.success("Berhasil keluar dari sistem.");
    window.location.href = "/login";
  };

  const isActive = (path: string) => pathname === path;
  const linkClass = (path: string) => 
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive(path) 
        ? "text-indigo-600 bg-indigo-50/80 font-semibold shadow-sm" 
        : "text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100/70"
    }`;

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} h-full bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 antialiased`}>
      <Toaster position="top-right" richColors theme="light" />
      <div className="flex h-screen overflow-hidden">
        
        {/* LIGHT SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200/80 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="md:hidden p-4 flex justify-end">
            <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-800"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-8">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <WalletCards className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-zinc-950 leading-tight">KasApp</h1>
                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 tracking-wider uppercase">
                  <Sparkles className="w-3 h-3 text-pink-500 animate-spin" /> Enterprise
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Core Modules</p>
              <Link href="/dashboard" className={linkClass("/dashboard")}><LayoutDashboard className="w-4.5 h-4.5" /> Dashboard Utama</Link>
              <Link href="/users" className={linkClass("/users")}><Users className="w-4.5 h-4.5" /> Manajemen Anggota</Link>
              <Link href="/transactions" className={linkClass("/transactions")}><WalletCards className="w-4.5 h-4.5" /> Jurnal Transaksi</Link>
              {/* 2. Tambahkan Link menu WhatsApp Bot di bawah sini */}
              <Link href="/whatsapp" className={linkClass("/whatsapp")}><MessageSquare className="w-4.5 h-4.5" /> WhatsApp Bot</Link>
            </nav>
          </div>
        </aside>

        {/* OVERLAY MOBILE */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

        {/* MAIN WRAPPER */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/50">
          
          {/* LIGHT HEADER */}
          <header className="h-16 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Profile Card di Header dengan Role Dinamis */}
              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-white/20 pl-2 pr-2 py-1 rounded-2xl shadow-sm hover:shadow-indigo-500/10 hover:shadow-lg transition-all duration-300 animate-in fade-in zoom-in-95 duration-300">
                
                {/* Avatar dengan Glow effect */}
                <div className="relative">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/30">
                    {adminInitials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                </div>

                {/* Nama & Role */}
                <div className="hidden md:flex flex-col justify-center leading-none pr-1">
                  <p className="text-xs font-bold text-zinc-950 tracking-tight">{adminName}</p>
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5 opacity-80">{adminRole}</p>
                </div>

                {/* Logout dengan ikon */}
                <button 
                  onClick={handleLogout} 
                  title="Keluar Sistem"
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm transition-all duration-300 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* SCROLLABLE CONTENT VIEW */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}