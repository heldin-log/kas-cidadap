'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Send, CheckCircle2, XCircle, Settings, QrCode, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/config';
import { QRCodeCanvas } from 'qrcode.react';

export default function WhatsAppBotPage() {
  const [botStatus, setBotStatus] = useState<string>('disconnected');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [botPhone, setBotPhone] = useState<string>('');
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [targetGroup, setTargetGroup] = useState<string>('');
  const [schedule, setSchedule] = useState<string>('daily');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(true);
  const [messageTemplate, setMessageTemplate] = useState<string>('Memuat data rekap...');

  const checkBotInfo = async () => {
    try {
      // 1. Ambil info bot & daftar grup dari port 8080
      const res = await fetch('http://localhost:8080/bot-info');
      const data = await res.json();
      setBotStatus(data.status);

      if (data.status === 'qr_ready') {
        setQrCodeData(data.qr);
      } else if (data.status === 'connected') {
        setBotPhone(data.phoneNumber);
        setGroups(data.groups || []);

        // 2. Ambil konfigurasi (target grup & schedule) yang tersimpan di Database FastAPI
        try {
          const configRes = await fetch(`${API_URL}/api/whatsapp/config`);
          const configData = await configRes.json();
          
          // Set target grup jika ada di database, jika tidak fallback ke grup pertama
          if (configData.target) {
            setTargetGroup(configData.target);
          } else if (!targetGroup && data.groups && data.groups.length > 0) {
            setTargetGroup(data.groups[0].id);
          }

          // Set tempo/schedule jika ada di database
          if (configData.schedule) {
            setSchedule(configData.schedule);
          }
        } catch (e) {
          console.error("Gagal memuat konfigurasi dari database:", e);
          if (!targetGroup && data.groups && data.groups.length > 0) {
            setTargetGroup(data.groups[0].id);
          }
        }
      }
    } catch (err) {
      setBotStatus('disconnected');
    }
  };

  useEffect(() => {
    checkBotInfo();
    const interval = setInterval(checkBotInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResetSession = async () => {
    if (!confirm("Yakin ingin mengganti nomor? Bot akan offline dan meminta scan ulang.")) return;
    setIsResetting(true);
    try {
      const res = await fetch('http://localhost:8080/reset-session', { method: 'POST' });
      if (res.ok) {
        toast.success("Sesi berhasil direset.");
        setBotStatus('disconnected');
        setQrCodeData('');
        checkBotInfo();
      }
    } catch (err) {
      toast.error("Gagal mereset sesi.");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/whatsapp-summary/`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Gagal mengambil data rekap');
        const data = await response.json();
        if (!isActive) return;
        setMessageTemplate(data.summary_text || 'Format pesan kosong.');
      } catch (error) {
        if ((error as Error).name === 'AbortError' || !isActive) return;
        setMessageTemplate('Gagal memuat data rekap dari server.');
      } finally {
        clearTimeout(timeoutId);
        if (isActive) setIsFetchingData(false);
      }
    };

    void fetchSummary();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetGroup, schedule: schedule }) // Kirim target & schedule
      });
      if (response.ok) toast.success('Pengaturan grup & tempo berhasil disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan.');
    } finally {
      setIsLoading(false);
    }
};

  const handleSendTest = async () => {
    try {
      toast.loading("Mengirim pesan ke WhatsApp...");
      
      const response = await fetch(`${API_URL}/api/whatsapp/send-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetGroup })
      });

      toast.dismiss();

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Gagal mengirim pesan');
      }

      const result = await response.json();
      toast.success(result.message || 'Pesan berhasil dikirim!');
    } catch (error: any) {
      toast.dismiss();
      console.error(error);
      toast.error(error.message || 'Gagal mengirim. Pastikan bot aktif.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-zinc-200/80">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            Integrasi WhatsApp Bot
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-1">
            Kelola pengiriman rekap dan laporan kas otomatis langsung ke grup WhatsApp warga.
          </p>
        </div>

        {/* Status Perangkat Badge */}
        <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200/80">
          <span className="text-xs font-medium text-zinc-600">Status Bot:</span>
          {botStatus === 'connected' ? (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Terhubung (+{botPhone})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold">
              <XCircle className="w-4 h-4" /> Belum Terhubung
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Sesi & Pengaturan Target */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Manajemen Sesi Bot & QR Code Visual */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-200/80 space-y-4 text-center">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-zinc-500" />
              Sesi WhatsApp Bot
            </h2>

            {botStatus === 'connected' ? (
              <div className="py-2 space-y-3">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-zinc-800">Bot Aktif & Siap Digunakan</p>
                <button 
                  onClick={handleResetSession} 
                  disabled={isResetting}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" /> Ganti Nomor / Reset Bot
                </button>
              </div>
            ) : qrCodeData ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-xs text-zinc-500">Scan QR Code di bawah ini:</p>
                <div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-inner inline-block">
                  <QRCodeCanvas value={qrCodeData} size={180} />
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-2">
                <p className="text-xs text-zinc-500 animate-pulse">Menghubungkan ke server bot...</p>
                <p className="text-[10px] text-amber-600 font-medium">
                  Pastikan service Node.js bot (port 8080) sedang berjalan.
                </p>
              </div>
            )}
          </div>

          {/* Pengaturan Target Grup */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-200/80 space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" />
              Pilih Grup Tujuan
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Daftar Grup WhatsApp Anda
                </label>
                {groups.length > 0 ? (
                    <select 
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm bg-white transition-all text-zinc-800 font-medium"
                    >
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                        {g.name}
                        </option>
                    ))}
                    </select>
                ) : (
                    <input 
                    type="text" 
                    value={targetGroup}
                    disabled
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-xs text-zinc-400"
                    placeholder="Memuat daftar grup..."
                    />
                )}
                </div>

                {/* PILIHAN TEMPO / FREKUENSI */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Tempo / Frekuensi Pengiriman Otomatis
                </label>
                <select 
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm bg-white transition-all text-zinc-800 font-medium"
                >
                  <option value="daily">Sehari Sekali (Harian - Pukul 08:00)</option>
                  <option value="weekly">Seminggu Sekali (Setiap Senin Pukul 08:00)</option>
                  <option value="monthly">Sebulan Sekali (Tanggal 1 Pukul 08:00)</option>
                  <option value="yearly">Setahun Sekali (1 Januari Pukul 08:00)</option>
                </select>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Kolom Kanan: Pratinjau & Tombol Tes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-zinc-200/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Pratinjau Format Pesan Laporan</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Teks di bawah ini ditarik langsung secara otomatis dari database kas Anda.
                </p>
              </div>
              {isFetchingData && <span className="text-xs text-indigo-600 animate-pulse font-medium">Memuat data...</span>}
            </div>

            <div>
              <textarea 
                rows={11}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full font-mono text-xs md:text-sm p-4 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-zinc-50/50 transition-all text-zinc-800 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={handleSendTest}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                Kirim Tes ke Grup
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}