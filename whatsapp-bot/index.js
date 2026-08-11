const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const express = require("express");
const cors = require("cors");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
let cachedGroups = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000;
const axios = require("axios");
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const app = express();
app.use(cors());
app.use(express.json());

let sock;
let qrCodeData = "";
let connectionStatus = "disconnected";

async function connectToWhatsApp() {
  const authFolder = path.join(__dirname, "auth_info_baileys");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
  });

  // RESPON CHAT
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const messageContent =
      msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // DEKLARASIKAN DI SINI AGAR BISA DIAKSES SEMUA PERINTAH DI BAWAHNYA
    const textClean = messageContent.trim().toLowerCase();
    const remoteJid = msg.key.remoteJid;

    // 1. Cek #kas
    if (textClean === "#kas") {
      console.log(`Menerima perintah '#kas' dari: ${remoteJid}`);
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/whatsapp-summary/`,
        );
        await sock.sendMessage(
          remoteJid,
          { text: response.data.summary_text },
          { quoted: msg },
        );
      } catch (error) {
        console.error("Gagal merespon #kas:", error.message);
      }
    }

    // 2. Cek #pemasukan
    else if (textClean === "#pemasukan") {
      console.log(`Menerima perintah '#pemasukan' dari: ${remoteJid}`);
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/whatsapp-income/`,
        );
        await sock.sendMessage(
          remoteJid,
          { text: response.data.income_text },
          { quoted: msg },
        );
      } catch (error) {
        console.error("Gagal merespon #pemasukan:", error.message);
        await sock.sendMessage(
          remoteJid,
          { text: "Maaf, gagal memuat data pemasukan." },
          { quoted: msg },
        );
      }
    }

    // 3. Cek #pengeluaran
    else if (textClean === "#pengeluaran") {
      console.log(`Menerima perintah '#pengeluaran' dari: ${remoteJid}`);
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/whatsapp-expense/`,
        );
        await sock.sendMessage(
          remoteJid,
          { text: response.data.expense_text },
          { quoted: msg },
        );
      } catch (error) {
        console.error("Gagal merespon #pengeluaran:", error.message);
        await sock.sendMessage(
          remoteJid,
          { text: "Maaf, gagal memuat data pengeluaran." },
          { quoted: msg },
        );
      }
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeData = qr;
      connectionStatus = "qr_ready";
      console.log("Scan QR Code di bawah ini menggunakan WhatsApp Anda:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      connectionStatus = "disconnected";
      qrCodeData = "";
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "Koneksi terputus, mencoba menghubungkan kembali...",
        shouldReconnect,
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      connectionStatus = "connected";
      qrCodeData = "";
      console.log("WhatsApp Bot berhasil terhubung!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Endpoint untuk mereset sesi (Ganti Nomor / Logout)
app.post("/reset-session", async (req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        // Abaikan jika sudah terputus
      }
      sock.end(undefined);
      sock = null;
    }

    const sessionPath = path.join(__dirname, "auth_info_baileys");
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    connectionStatus = "disconnected";
    qrCodeData = "";

    // Sambungkan ulang untuk memicu QR baru
    connectToWhatsApp();

    res.json({ status: "success", message: "Sesi berhasil direset." });
  } catch (error) {
    console.error("Gagal reset sesi:", error);
    res.status(500).json({ status: "error", message: "Gagal mereset sesi" });
  }
});

// Endpoint info bot & daftar grup
app.get("/bot-info", async (req, res) => {
  if (connectionStatus === "connected" && sock) {
    try {
      const user = sock.user ? sock.user.id.split(":")[0] : "";
      const now = Date.now();

      // Jika cache sudah ada dan belum ada 1 menit, gunakan cache agar tidak kena rate-limit
      if (cachedGroups.length > 0 && now - lastFetchTime < CACHE_DURATION) {
        return res.json({
          status: "connected",
          phoneNumber: user,
          groups: cachedGroups,
        });
      }

      // Jika belum atau sudah lebih dari 1 menit, ambil baru ke server WhatsApp
      const chats = await sock.groupFetchAllParticipating();
      cachedGroups = Object.values(chats).map((chat) => ({
        id: chat.id,
        name: chat.subject || "Grup Tanpa Nama",
      }));
      lastFetchTime = now;

      res.json({
        status: "connected",
        phoneNumber: user,
        groups: cachedGroups,
      });
    } catch (err) {
      console.error("Gagal ambil grup:", err.message || err);
      // Jika terkena rate-limit, fallback pakai cache terakhir jika ada
      res.json({
        status: "connected",
        phoneNumber: sock.user ? sock.user.id.split(":")[0] : "",
        groups: cachedGroups,
      });
    }
  } else {
    res.json({ status: connectionStatus, qr: qrCodeData });
  }
});

// Endpoint kirim pesan
app.post("/send-message", async (req, res) => {
  const { number, message } = req.body;

  if (connectionStatus !== "connected") {
    return res
      .status(400)
      .json({ status: "error", message: "Bot belum terhubung ke WhatsApp!" });
  }

  try {
    const target = number.includes("@") ? number : `${number}@s.whatsapp.net`;
    await sock.sendMessage(target, { text: message });

    return res.json({ status: "success", message: "Pesan berhasil dikirim!" });
  } catch (error) {
    console.error("Gagal kirim pesan:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`WhatsApp Bot Service berjalan di port ${PORT}`);
  connectToWhatsApp();
});
