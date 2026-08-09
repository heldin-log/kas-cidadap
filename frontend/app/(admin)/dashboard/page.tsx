"use client";

import { useEffect, useState } from "react";
import { WalletCards, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/config";

interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambil data transaksi dan user dari backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTx, resUser] = await Promise.all([
          fetch(`${API_URL}/transactions/`),
          fetch(`${API_URL}/users/`)
        ]);
        
        const txData = await resTx.json();
        const userData = await resUser.json();
        
        setTransactions(txData);
        setUsers(userData);
      } catch (error) {
        toast.error("Gagal memuat data ringkasan dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hitung statistik keuangan
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="max-w-screen-2xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      
      {/* Header Sambutan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" /> Financial Overview & Analytics
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950">
            Dashboard Utama
          </h2>
          <p className="text-xs text-zinc-600 mt-1">Ringkasan total saldo kas, arus masuk-keluar, dan direktori anggota kas.</p>
        </div>
      </div>

      {/* Kartu Statistik Utama (Grid 3 Kolom) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Saldo */}
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-xl shadow-zinc-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Saldo Kas</span>
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <WalletCards className="w-5 h-5" />
            </div>
          </div>
          <div className="my-6 relative z-10">
            <h3 className="text-3xl font-black text-zinc-950 font-mono tracking-tight">
              {loading ? "..." : formatRupiah(netBalance)}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Saldo bersih saat ini
            </p>
          </div>
        </div>

        {/* Total Pemasukan */}
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-xl shadow-zinc-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Pemasukan</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="my-6 relative z-10">
            <h3 className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
              {loading ? "..." : formatRupiah(totalIncome)}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Akumulasi dana kas masuk</p>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-xl shadow-zinc-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Pengeluaran</span>
            <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="my-6 relative z-10">
            <h3 className="text-3xl font-black text-rose-600 font-mono tracking-tight">
              {loading ? "..." : formatRupiah(totalExpense)}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Akumulasi pengeluaran kas</p>
          </div>
        </div>

      </div>

      {/* Bagian Bawah: Aktivitas Transaksi Terbaru & Info Anggota */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabel Transaksi Terbaru (2 Kolom) */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 rounded-3xl shadow-xl shadow-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-zinc-950">Transaksi Terbaru</h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">5 Terakhir</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {loading ? (
              <p className="py-8 text-center text-xs text-zinc-400">Memuat data...</p>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-400">Belum ada transaksi tercatat.</p>
            ) : (
              transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{t.title}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">{t.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ringkasan Anggota (1 Kolom) */}
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-xl shadow-zinc-100 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-zinc-950">Total Anggota</h3>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 text-center space-y-1">
              <p className="text-3xl font-black text-indigo-600 font-mono">{users.length}</p>
              <p className="text-xs font-semibold text-zinc-500">Anggota Terdaftar</p>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-400 text-center">
            Sistem KasApp Enterprise v1.0
          </div>
        </div>

      </div>

    </div>
  );
}