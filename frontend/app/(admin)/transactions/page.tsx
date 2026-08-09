"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, WalletCards, ArrowUpRight, ArrowDownLeft, Search, Filter, X, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import Pagination from 'rc-pagination';
import { API_URL } from "@/config";

interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Form State
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState(getTodayDate());

  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTransactions = async () => {
        try {
          const res = await fetch(`${API_URL}/transactions/`);
      const data = await res.json();
      setTransactions(data.sort((a: Transaction, b: Transaction) => b.id - a.id));
    } catch (error) {
      toast.error("Gagal mengambil data transaksi dari server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/transactions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount: parseFloat(amount), type, date }),
      });

      if (res.ok) {
        setTitle("");
        setAmount("");
        setType("income");
        setDate(getTodayDate());
        setIsModalOpen(false);
        fetchTransactions();
        setCurrentPage(1);
        toast.success("Transaksi berhasil dicatat!");
      } else {
        toast.error("Gagal mencatat transaksi.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`${API_URL}/transactions/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTransactions();
        if (currentTableData.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        toast.success("Catatan transaksi dihapus.");
      } else {
        toast.error("Gagal menghapus transaksi.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan pada server.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const getSimpleIndex = (index: number) => {
    return indexOfFirstItem + index + 1;
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
  };

  // Format Tanggal Transaksi (YYYY-MM-DD -> 09 Agu 2026)
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "-";
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Format Tanggal Dibuat (Timestamp ke format lokal)
  const formatDateTimeDisplay = (timestamp: string) => {
    if (!timestamp) return "-";
    
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return "-";

    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
      // Bagian jam dan menit sengaja dihapus
    };
    
    return new Intl.DateTimeFormat('id-ID', options).format(dateObj);
  };

  return (
    <div className="max-w-screen-2xl mx-auto space-y-8 pb-16 relative animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10" id="transaction-table-top">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" /> Financial Ledger Core
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950">
            Jurnal Transaksi Kas
          </h2>
          <p className="text-xs text-zinc-600 mt-1">Pencatatan arus kas masuk (pemasukan) dan keluar (pengeluaran) secara real-time.</p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/20 text-xs transition-all duration-200 transform hover:scale-[1.02] active:scale-95 border border-emerald-500/30"
        >
          <PlusCircle className="w-4 h-4" /> Catat Transaksi Baru
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-md shadow-zinc-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sisa Saldo Kas</span>
            <div className="h-9 w-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <WalletCards className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-zinc-950">{formatRupiah(netBalance)}</h3>
          <p className="text-[11px] text-zinc-500">Akumulasi bersih kas saat ini</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-md shadow-zinc-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Pemasukan</span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-600">{formatRupiah(totalIncome)}</h3>
          <p className="text-[11px] text-zinc-500">Kas masuk terakumulasi</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-md shadow-zinc-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Pengeluaran</span>
            <div className="h-9 w-9 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-rose-600">{formatRupiah(totalExpense)}</h3>
          <p className="text-[11px] text-zinc-500">Kas keluar terakumulasi</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 relative z-10">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-zinc-200 p-4 rounded-2xl shadow-md shadow-zinc-100">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-indigo-600" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan keterangan transaksi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full md:w-48 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-800 outline-none focus:border-indigo-600 transition-all font-medium"
            >
              <option value="all">Semua Kategori</option>
              <option value="income">Pemasukan Saja</option>
              <option value="expense">Pengeluaran Saja</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl shadow-zinc-200/50 flex flex-col justify-between min-h-[420px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider"><th className="py-4 px-6">No.</th>
                  <th className="py-4 px-6">Keterangan / Judul</th>
                  <th className="py-4 px-6">Kategori</th>
                  <th className="py-4 px-6">Nominal</th>
                  <th className="py-4 px-6">Tanggal Transaksi</th>
                  <th className="py-4 px-6">Tanggal Dibuat</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-8"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-48"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-24"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-28"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-28"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-32"></div></td>
                      <td className="py-5 px-6 text-right"><div className="h-8 bg-zinc-200 rounded w-10 ml-auto"></div></td>
                    </tr>
                  ))
                ) : currentTableData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-zinc-400">
                      {searchQuery || filterType !== 'all' ? 'Tidak ada transaksi yang sesuai pencarian/filter.' : 'Belum ada catatan transaksi yang ditemukan.'}
                    </td>
                  </tr>
                ) : (
                  currentTableData.map((t, index) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-indigo-50/40 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 font-mono text-zinc-500 font-semibold">
                        {getSimpleIndex(index)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-900 text-sm">
                        {t.title}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm ${
                          t.type === 'income' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.type === 'income' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>
                      <td className={`py-4 px-6 font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatRupiah(t.amount)}
                      </td>
                      {/* Tanggal Transaksi (Setelah Nominal) */}
                      <td className="py-4 px-6 text-zinc-600 font-medium">
                        <span className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" /> {formatDateDisplay(t.date)}
                        </span>
                      </td>
                      {/* Tanggal Dibuat (Sebelum Aksi) */}
                      <td className="py-4 px-6 text-zinc-500 font-medium">
                        <span className="inline-flex items-center gap-1.5 text-zinc-500">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" /> {formatDateTimeDisplay(t.created_at)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setDeleteTargetId(t.id)}
                          className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-none rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredTransactions.length > 0 && (
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-zinc-500">
                Menampilkan <span className="font-semibold text-zinc-800">{indexOfFirstItem + 1}</span> sampai <span className="font-semibold text-zinc-800">{Math.min(indexOfLastItem, filteredTransactions.length)}</span> dari total <span className="font-semibold text-zinc-800">{filteredTransactions.length}</span> data transaksi
              </p>
              <Pagination
                onChange={(page) => {
                  setCurrentPage(page);
                  document.getElementById('transaction-table-top')?.scrollIntoView({ behavior: 'smooth' });
                }}
                current={currentPage}
                total={filteredTransactions.length}
                pageSize={itemsPerPage}
              />
            </div>
          )}
        </div>

      </div>

      {/* --- MODAL TAMBAH TRANSAKSI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm"
          />
          <div className="relative bg-white border border-zinc-200 w-full max-w-lg rounded-3xl p-7 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Catat Transaksi Kas</h3>
                  <p className="text-xs text-zinc-500">Pilih kategori, masukkan tanggal, dan nominal.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-2 rounded-xl hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Kategori Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      type === "income" 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      type === "expense" 
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                  </button>
                </div>
              </div>

              {/* Input Tanggal Transaksi */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Tanggal Transaksi</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-all shadow-inner font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Keterangan / Judul Transaksi</label>
                <input
                  type="text"
                  placeholder="Contoh: Iuran Kas Bulanan Warga"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Nominal (Rupiah)</label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-all shadow-inner font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-100">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-5 bg-transparent border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-2xl text-xs transition-all shadow-none"
                >
                  Batalkan
                </Button>
                <Button 
                  type="submit" 
                  className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/20 text-xs transition-all duration-200 transform hover:scale-[1.02] active:scale-95"
                >
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HAPUS --- */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            onClick={() => setDeleteTargetId(null)}
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm"
          />
          <div className="relative bg-white border border-zinc-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center z-10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mx-auto shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Hapus Data Transaksi</h3>
              <p className="text-xs text-zinc-500 mt-1">Tindakan ini akan memperbarui total saldo kas secara otomatis.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 h-10 bg-transparent border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button 
                onClick={confirmDelete}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all transform hover:scale-[1.02] active:scale-95"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}