"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, PlusCircle, Users, Search, X, Sparkles, AlertTriangle, Phone, Shield, Edit3, Lock } from "lucide-react";
import { toast } from "sonner";
import Pagination from 'rc-pagination';

interface User {
  id: number;
  name: string;
  phone: string;
  password?: string;
  role: string;
  created_at?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  
  // State Modal Tambah (Ditambah password)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");

  // State Modal Edit (Ditambah password)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("member");

  // State Modal Hapus
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/users/");
      const data = await res.json();
      setUsers(data.sort((a: User, b: User) => b.id - a.id));
    } catch (error) {
      toast.error("Gagal mengambil data anggota dari server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handler Tambah User
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, role }),
      });

      if (res.ok) {
        setName("");
        setPhone("");
        setPassword("");
        setRole("member");
        setIsModalOpen(false);
        fetchUsers();
        setCurrentPage(1);
        toast.success("Anggota baru berhasil ditambahkan!");
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Gagal menambahkan anggota.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  // Handler Buka Modal Edit & Isi Data Awal
  const openEditModal = (user: User) => {
    setEditUserId(user.id);
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditPassword(user.password || "");
    setEditRole(user.role);
    setIsEditModalOpen(true);
  };

  // Handler Simpan Perubahan Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${editUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone, password: editPassword, role: editRole }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchUsers();
        toast.success("Data anggota berhasil diperbarui!");
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Gagal memperbarui anggota.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  // Handler Hapus User
  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsers();
        if (currentTableData.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        toast.success("Data anggota dihapus.");
      } else {
        toast.error("Gagal menghapus anggota.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan pada server.");
    } finally {
      setDeleteTargetId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const getSimpleIndex = (index: number) => {
    return indexOfFirstItem + index + 1;
  };

  return (
    <div className="max-w-screen-2xl mx-auto space-y-8 pb-16 relative animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10" id="user-table-top">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Member Directory Core
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950">
            Manajemen Anggota
          </h2>
          <p className="text-xs text-zinc-600 mt-1">Kelola data anggota, nomor kontak, password, dan hak akses peran (role).</p>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 text-xs transition-all duration-200 transform hover:scale-[1.02] active:scale-95 border border-indigo-500/30"
        >
          <PlusCircle className="w-4 h-4" /> Tambah Anggota Baru
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 relative z-10">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-zinc-200 p-4 rounded-2xl shadow-md shadow-zinc-100">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-indigo-600" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama atau nomor telepon..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full md:w-48 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-800 outline-none focus:border-indigo-600 transition-all font-medium"
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl shadow-zinc-200/50 flex flex-col justify-between min-h-[420px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-4 px-6">No.</th>
                  <th className="py-4 px-6">Nama Anggota</th>
                  <th className="py-4 px-6">Nomor Telepon</th>
                  <th className="py-4 px-6">Peran (Role)</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-8"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-48"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-32"></div></td>
                      <td className="py-5 px-6"><div className="h-4 bg-zinc-200 rounded w-24"></div></td>
                      <td className="py-5 px-6 text-right"><div className="h-8 bg-zinc-200 rounded w-20 ml-auto"></div></td>
                    </tr>
                  ))
                ) : currentTableData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-400">
                      {searchQuery || filterRole !== 'all' ? 'Tidak ada anggota yang sesuai pencarian/filter.' : 'Belum ada data anggota terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  currentTableData.map((u, index) => (
                    <tr 
                      key={u.id} 
                      className="hover:bg-indigo-50/40 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 font-mono text-zinc-500 font-semibold">
                        {getSimpleIndex(index)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-900 text-sm">
                        {u.name}
                      </td>
                      <td className="py-4 px-6 text-zinc-600 font-mono">
                        <span className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-indigo-600" /> {u.phone}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm ${
                          u.role === 'admin' 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}>
                          <Shield className="w-3.5 h-3.5" />
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {/* Tombol Edit */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEditModal(u)}
                          className="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-all shadow-none rounded-xl"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {/* Tombol Hapus */}
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setDeleteTargetId(u.id)}
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

          {!loading && filteredUsers.length > 0 && (
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-zinc-500">
                Menampilkan <span className="font-semibold text-zinc-800">{indexOfFirstItem + 1}</span> sampai <span className="font-semibold text-zinc-800">{Math.min(indexOfLastItem, filteredUsers.length)}</span> dari total <span className="font-semibold text-zinc-800">{filteredUsers.length}</span> data anggota
              </p>
              <Pagination
                onChange={(page) => {
                  setCurrentPage(page);
                  document.getElementById('user-table-top')?.scrollIntoView({ behavior: 'smooth' });
                }}
                current={currentPage}
                total={filteredUsers.length}
                pageSize={itemsPerPage}
              />
            </div>
          )}
        </div>

      </div>

      {/* --- MODAL TAMBAH ANGGOTA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm" />
          <div className="relative bg-white border border-zinc-200 w-full max-w-lg rounded-3xl p-7 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Tambah Anggota Baru</h3>
                  <p className="text-xs text-zinc-500">Masukkan nama, nomor telepon, password, dan tentukan peran.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors p-2 rounded-xl hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Password Akses (Wajib)</label>
                <input
                  type="password"
                  placeholder="Masukkan password anggota"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Peran (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-800 outline-none focus:border-indigo-600 transition-all font-medium"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-11 px-5 bg-transparent border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-2xl text-xs transition-all shadow-none">
                  Batalkan
                </Button>
                <Button type="submit" className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 text-xs transition-all duration-200 transform hover:scale-[1.02] active:scale-95">
                  Simpan Anggota
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT ANGGOTA --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm" />
          <div className="relative bg-white border border-zinc-200 w-full max-w-lg rounded-3xl p-7 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Edit Data Anggota</h3>
                  <p className="text-xs text-zinc-500">Perbarui informasi nama, nomor telepon, password, atau peran.</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors p-2 rounded-xl hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Password Akses (Wajib)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  required
                  placeholder="Masukkan password baru atau ubah"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-inner font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Peran (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs text-zinc-800 outline-none focus:border-indigo-600 transition-all font-medium"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="h-11 px-5 bg-transparent border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-2xl text-xs transition-all shadow-none">
                  Batalkan
                </Button>
                <Button type="submit" className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 text-xs transition-all duration-200 transform hover:scale-[1.02] active:scale-95">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HAPUS --- */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div onClick={() => setDeleteTargetId(null)} className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm" />
          <div className="relative bg-white border border-zinc-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center z-10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mx-auto shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">Hapus Data Anggota</h3>
              <p className="text-xs text-zinc-500 mt-1">Tindakan ini akan menghapus anggota dari sistem secara permanen.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTargetId(null)} className="flex-1 h-10 bg-transparent border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-xl text-xs">
                Batal
              </Button>
              <Button onClick={confirmDelete} className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all transform hover:scale-[1.02] active:scale-95">
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}