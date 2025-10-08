// mock-server.cjs
// Node.js mock server com Pushbullet alerts (CommonJS)
// Run: node mock-server.cjs

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');
const { error } = require('console');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

const PUSH_TOKEN = process.env.PUSHBULLET_TOKEN || "o.QjW0w3GZtHAWMqOyBYaCbrD8PD41u7LI";
if (!PUSH_TOKEN) console.warn("⚠️ PUSHBULLET_TOKEN não definido. Notificações push estarão desativadas.");

// função verbosa para enviar push (logs úteis para debug)
async function sendPush(title, body) {
  if (!PUSH_TOKEN) {
    console.log("[push] token ausente, ignorando envio:", title, body);
    return;
  }
  try {
    console.log("[push] POST https://api.pushbullet.com/v2/pushes ->", { title, body });
    const resp = await axios.post(
      "https://api.pushbullet.com/v2/pushes",
      { type: "note", title, body },
      { headers: { "Access-Token": PUSH_TOKEN, "Content-Type": "application/json" }, timeout: 10000 }
    );
    console.log("✅ Push enviado:", title, "status:", resp.status);
    if (resp.data) console.log("push response:", JSON.stringify(resp.data, null, 2));
    return resp.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error("❌ Falha ao enviar push:", status || err.code || err.message);
    if (data) console.error("response.data:", JSON.stringify(data, null, 2));
    else console.error(err.stack?.split("\n").slice(0,4).join("\n"));
    throw error;
  }
}

// opcional: listar devices (útil para checar que o token vê o celular)
// NÃO chame automaticamente em produção; só pra debug.
// async function listDevices() { ... }

//
// --- Simulação / endpoints (mantive o que já tinhas) ---
//
let t0 = Date.now();
function simulate(now = Date.now()) {
  const s = (now - t0) / 1000;
  const temp = 22 + 2 * Math.sin(s * 0.05) + (Math.random() - 0.5) * 0.4;
  const hum = 55 + 8 * Math.sin(s * 0.03 + 1.2) + (Math.random() - 0.5) * 1.2;
  const water = 60 + 20 * Math.sin(s * 0.01 + 2.5) + (Math.random() - 0.5) * 2;
  const battery = 3.9 - 0.00005 * s + (Math.random() - 0.5) * 0.001;
  return {
    device_id: "mock-esp32-01",
    ts: new Date().toISOString(),
    temperature: Number(temp.toFixed(2)),
    humidity: Number(hum.toFixed(2)),
    water_level: Number(Math.max(0, Math.min(100, water.toFixed(2)))),
    battery: Number(battery.toFixed(3))
  };
}

let current = simulate();

app.get('/sensors', (req, res) => res.json(current));

app.post('/control', (req, res) => {
  console.log('control recebido:', req.body);
  res.json({ ok: true, received: req.body });
});

app.get('/health', (req, res) => res.send('ok'));

app.post('/inject/spike', (req, res) => {
  const { field, value, durationSec = 5 } = req.body || {};
  if (!field) return res.status(400).json({ error: 'field required' });
  if (!(field in current)) return res.status(400).json({ error: 'field not found on current data' });
  const original = current[field];
  current[field] = value;
  setTimeout(() => { current[field] = original; }, durationSec * 1000);
  console.log(`[inject] field=${field} value=${value} durationSec=${durationSec}`);
  res.json({ ok: true, field, value, durationSec });
});

app.post('/test/push', async (req, res) => {
  const { title = "Teste", body = "Mensagem de teste" } = req.body || {};
  try {
    await sendPush(title, body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

//
// --- REPORT ALERT endpoint (seguro por API key opcional) ---
//
const ALERT_REPORT_COOLDOWN_MS = Number(process.env.ALERT_REPORT_COOLDOWN_MS) || 60_000;
const REPORT_API_KEY = process.env.REPORT_API_KEY || ""; // se definido, UI deve enviar header x-api-key
const reportLastAt = {}; // map type -> timestamp

app.post('/report/alert', async (req, res) => {
  try {
    // se houver REPORT_API_KEY configurada, exige cabeçalho x-api-key igual
    if (REPORT_API_KEY) {
      const key = req.headers['x-api-key'] || req.headers['X-API-KEY'] || req.headers['x_api_key'];
      if (!key || key !== REPORT_API_KEY) {
        return res.status(401).json({ ok: false, error: 'unauthorized (invalid x-api-key)' });
      }
    }

    const payload = req.body || {};
    const { type = 'reported', level = 'warning', message = '', sample = null } = payload;

    const now = Date.now();
    const last = reportLastAt[type] || 0;
    if (now - last < ALERT_REPORT_COOLDOWN_MS) {
      return res.json({ ok: true, skipped: true, reason: 'cooldown' });
    }
    reportLastAt[type] = now;

    const title = level === 'critical' ? `⚠️ CRÍTICO: ${type}` : `⚠️ Alerta: ${type}`;
    const body = `${message || `Evento ${type} reportado pelo frontend`}${sample ? `\n\nSample: ${JSON.stringify(sample)}` : ''}`;

    try {
      await sendPush(title, body);
      console.log(`[report] alert sent type=${type} level=${level}`);
      return res.json({ ok: true, sent: true });
    } catch (e) {
      console.warn('[report] erro ao enviar push', e?.message || e);
      return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }

  } catch (err) {
    console.error('/report/alert handler error', err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

//
// --- WebSocket + broadcast + alerts automáticos do mock ---
//
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.send(JSON.stringify({ type: 'init', payload: current }));
  ws.on('message', (msg) => console.log('WS msg from client:', msg.toString().slice(0,200)));
  ws.on('close', () => console.log('WS client disconnected'));
});

function broadcast(data) {
  const s = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(s);
  });
}

const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 1000;
let lastUpdate = Date.now();

// thresholds configuráveis via .env
const INACTIVITY_THRESHOLD_MS = Number(process.env.INACTIVITY_THRESHOLD_MS) || 10_000;
const INACTIVITY_COOLDOWN_MS = Number(process.env.INACTIVITY_COOLDOWN_MS) || 60_000;

const TEMP_THRESHOLD = Number(process.env.TEMP_THRESHOLD) || 35;
const TEMP_COOLDOWN_MS = Number(process.env.TEMP_COOLDOWN_MS) || 5 * 60_000;

const WATER_THRESHOLD = Number(process.env.WATER_THRESHOLD) || 20;
const WATER_COOLDOWN_MS = Number(process.env.WATER_COOLDOWN_MS) || 5 * 60_000;

const lastAlertAt = { inactivity: 0, tempHigh: 0, waterLow: 0 };

// loop principal do mock
setInterval(() => {
  current = simulate();
  lastUpdate = Date.now();
  broadcast({ type: 'sensors', payload: current });

  const now = Date.now();

  // temperatura
  try {
    if (current.temperature != null) {
      if (current.temperature > TEMP_THRESHOLD && (now - lastAlertAt.tempHigh) > TEMP_COOLDOWN_MS) {
        const title = "🔥 Alerta: temperatura alta";
        const body = `Dispositivo ${current.device_id}: temperatura ${current.temperature} °C (limite ${TEMP_THRESHOLD} °C).`;
        sendPush(title, body).catch(()=>{});
        console.log("[alert] tempHigh sent:", body);
        lastAlertAt.tempHigh = now;
      }
    }
  } catch (e) { console.warn("Erro ao checar temperatura para alertas:", e); }

  // água
  try {
    if (current.water_level != null) {
      if (current.water_level < WATER_THRESHOLD && (now - lastAlertAt.waterLow) > WATER_COOLDOWN_MS) {
        const title = "💧 Alerta: nível de água baixo";
        const body = `Dispositivo ${current.device_id}: nível de água ${current.water_level}% (limite ${WATER_THRESHOLD}%).`;
        sendPush(title, body).catch(()=>{});
        console.log("[alert] waterLow sent:", body);
        lastAlertAt.waterLow = now;
      }
    }
  } catch (e) { console.warn("Erro ao checar nível de água para alertas:", e); }

}, INTERVAL_MS);

// inatividade
setInterval(() => {
  const now = Date.now();
  if ((now - lastUpdate) > INACTIVITY_THRESHOLD_MS) {
    if ((now - lastAlertAt.inactivity) > INACTIVITY_COOLDOWN_MS) {
      const title = "⚠️ Falha de comunicação";
      const body = `Nenhuma atualização recebida do dispositivo ${current.device_id} há ${(now - lastUpdate)/1000}s.`;
      sendPush(title, body).catch(()=>{});
      console.log("[alert] inactivity sent:", body);
      lastAlertAt.inactivity = now;
    }
  }
}, 5000);

server.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
  console.log(`WS endpoint ws://localhost:${port}`);
  // DEBUG: listDevices() se quiser (descomente e chame uma vez)
});
