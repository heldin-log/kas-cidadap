"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { API_URL } from "@/config";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Ambil role dari backend, berikan fallback "Super Admin" jika data.role kosong/undefined
        const userRole = data.role || "Super Admin";
        const userName = data.user || "Administrator";

        // Set cookie dengan path=/ agar terbaca di seluruh rute
        document.cookie = "isLoggedIn=true; path=/; max-age=86400; SameSite=Lax";
        document.cookie = `userName=${encodeURIComponent(userName)}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `userRole=${encodeURIComponent(userRole)}; path=/; max-age=86400; SameSite=Lax`;

        toast.success(`Login Berhasil! Selamat datang, ${userName}.`);
        
        // Gunakan window.location.href untuk hard refresh agar cookie langsung terbaca sempurna
        window.location.href = "/dashboard";
      } else {
        toast.error(data.detail || "Password salah! Silakan coba lagi.");
      }
    } catch (error) {
      toast.error("Gagal terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden p-4">
      
      {/* Background Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative bg-white/90 backdrop-blur-xl border border-zinc-200 w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-zinc-950/20 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> KasApp Enterprise
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">
            Admin Authentication
          </h2>
          <p className="text-xs text-zinc-500">Masukkan password rahasia untuk mengakses sistem kas.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 block">Password Akses</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-zinc-400">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type="password"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-11 pr-4 py-3 text-xs text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all font-mono tracking-wider" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoFocus
              />
            </div>
          </div>

          <Button 
  type="submit"
  disabled={loading}
  className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 text-xs transition-all transform hover:scale-[1.01] active:scale-95"
>
  {loading ? "Memeriksa..." : "Masuk ke Sistem"}
</Button>
        </form>

        <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure System Gateway
        </div>
      </div>
    </div>
  );
}