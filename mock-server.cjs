// mock-server.js
// Node.js mock server: /sensors (GET), /control (POST) e WebSocket em ws://localhost:3001
// Run: node mock-server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

// --- Simulação de dados ---
let t0 = Date.now();
function simulate(now = Date.now()) {
  const s = (now - t0) / 1000; // segundos desde start
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

// --- REST endpoints ---
app.get('/sensors', (req, res) => {
  res.json(current);
});

app.post('/control', (req, res) => {
  console.log('control recebido:', req.body);
  res.json({ ok: true, received: req.body });
});

app.get('/health', (req, res) => res.send('ok'));

// Optional: endpoint para injetar picos (ver seção opcional)
app.post('/inject/spike', (req, res) => {
  // Ex: { field: "temperature", value: 40, durationSec: 10 }
  const { field, value, durationSec = 5 } = req.body || {};
  if (!field) return res.status(400).json({ error: 'field required' });
  const original = current[field];
  current[field] = value;
  setTimeout(() => { current[field] = original; }, durationSec * 1000);
  res.json({ ok: true, field, value, durationSec });
});

// --- HTTP + WebSocket server ---
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

const INTERVAL_MS = 1000;
setInterval(() => {
  current = simulate();
  broadcast({ type: 'sensors', payload: current });
}, INTERVAL_MS);

server.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
  console.log(`WS endpoint ws://localhost:${port}`);
});
