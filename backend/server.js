const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PROXY_PORT = process.env.PORT || 4000;
const ESP_BASE = process.env.ESP_BASE || "http://192.168.1.3"; // IP do ESP32
const CALLMEBOT_KEY = process.env.CALLMEBOT_APIKEY;
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;

async function sendWhatsApp(message) {
  if (!CALLMEBOT_KEY || !CALLMEBOT_PHONE) {
    console.log("[whatsapp] credenciais ausentes:", message);
    return;
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(CALLMEBOT_PHONE)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(CALLMEBOT_KEY)}`;
  try {
    const r = await fetch(url);
    console.log("[whatsapp] mensagem enviada:", message);
    return await r.text();
  } catch (e) {
    console.error("[whatsapp] erro:", e.message);
  }
}

app.get('/api/sensors', async (req, res) => {
  try {
    const r = await fetch(`${ESP_BASE}/sensors`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/control', async (req, res) => {
  try {
    const r = await fetch(`${ESP_BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/report/alert', async (req, res) => {
  const { type, level, message } = req.body;
  let msg = `⚠️ ALERTA (${level?.toUpperCase()}): ${message}`;
  if (type === 'emergency_stop') msg = `🛑 EMERGÊNCIA: ${message}`;
  if (type === 'system_paused') msg = `⏸️ PAUSADO: ${message}`;
  if (type === 'system_resumed') msg = `▶️ RETOMADO: ${message}`;
  await sendWhatsApp(msg);
  res.json({ ok: true });
});

app.listen(PROXY_PORT, () => console.log(`✅ Proxy ativo em http://localhost:${PROXY_PORT} → ESP: ${ESP_BASE}`));
