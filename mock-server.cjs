// mock-server.cjs
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'x-api-key'] }));
app.use(express.json());

const port = Number(process.env.PORT) || 4000;

// CALLMEBOT config
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || "";
const PHONE_NUMBER = process.env.CALLMEBOT_PHONE || "";

console.log('🔧 [DEBUG] Configuração WhatsApp:', {
  hasApiKey: !!CALLMEBOT_APIKEY,
  hasPhone: !!PHONE_NUMBER,
  phone: PHONE_NUMBER ? '***' + PHONE_NUMBER.slice(-4) : 'não definido',
  apiKey: CALLMEBOT_APIKEY ? '***' + CALLMEBOT_APIKEY.slice(-4) : 'não definido'
});

async function sendWhatsApp(message) {
  if (!CALLMEBOT_APIKEY || !PHONE_NUMBER) {
    console.log("❌ [DEBUG] Credenciais ausentes -> ignorando envio");
    throw new Error("Credenciais WhatsApp não configuradas");
  }
  
  const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_APIKEY}`;
  
  console.log('📤 [DEBUG] Tentando enviar WhatsApp:', message);
  console.log('🔗 [DEBUG] URL:', url.substring(0, 100) + '...');
  
  try {
    const res = await axios.get(url, { 
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    console.log("✅ [DEBUG] Resposta da API:", {
      status: res.status,
      data: res.data,
      headers: res.headers
    });
    
    // 👇 VERIFICAÇÃO ESPECÍFICA DO STATUS
    if (res.status === 200 || res.status === 209) {
      console.log('🎉 [DEBUG] MENSAGEM ENVIADA COM SUCESSO! Status:', res.status);
    } else {
      console.log('⚠️ [DEBUG] Status inesperado:', res.status);
    }
    
    return res.data;
  } catch (err) {
    console.error("❌ [DEBUG] ERRO AO ENVIAR:", {
      message: err.message,
      code: err.code,
      response: err.response?.data,
      status: err.response?.status
    });
    throw err;
  }
}

// --- mock sensors ---
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
    water_level: Number(Math.max(0, Math.min(100, Number(water.toFixed(2))))),
    battery: Number(battery.toFixed(3))
  };
}

let current = simulate();

app.get('/sensors', (req, res) => {
  console.log('📡 [DEBUG] /sensors requisitado');
  res.json(current);
});

app.post('/control', async (req, res) => {
  console.log('🎮 [DEBUG] /control recebido:', JSON.stringify(req.body));
  const reqBody = req.body;
  const control = { ...reqBody, ...(reqBody.payload || {}) };

  broadcast({ type: 'control', payload: control });

  res.json({ ok: true, received: reqBody });
});

// ROTA PARA ALERTAS CallMeBot - COM DEBUG COMPLETO
app.post('/alert', async (req, res) => {
  console.log('📨 [DEBUG] /alert recebido:', JSON.stringify(req.body, null, 2));
  const { type, level, message } = req.body;

  let whatsappMessage = "";

  // Formata a mensagem conforme o tipo
  if (type === 'emergency_stop' && level === 'critical') {
    whatsappMessage = `🛑 ALERTA CRÍTICO: ${message}`;
  } else if (type === 'system_paused' || type === 'system_resumed') {
    const emoji = type === 'system_paused' ? '⏸️' : '▶️';
    whatsappMessage = `${emoji} ${message}`;
  } else if (type === 'humidity_high') {
    whatsappMessage = `⚠️ ALERTA DE HUMIDADE ALTA: ${message}`;
  } else if (type === 'humidity_low') {
    whatsappMessage = `🔻 ALERTA DE HUMIDADE BAIXA: ${message}`;
  } else if (type === 'normal_operations' || type === 'sensor_data') {
    whatsappMessage = `🌱 ${message}`;
  } else if (message) {
    whatsappMessage = `📋 ${message}`;
  } else {
    console.log('❌ [DEBUG] Dados de alerta inválidos');
    return res.status(400).json({ ok: false, error: "Dados de alerta inválidos." });
  }

  console.log('🔄 [DEBUG] Processando notificação WhatsApp:', whatsappMessage);

  try {
    const result = await sendWhatsApp(whatsappMessage);
    console.log('✅ [DEBUG] Notificação enviada com sucesso!');
    res.json({ ok: true, sent: true, result });
  } catch (err) {
    console.error('❌ [DEBUG] ERRO ao enviar notificação:', err.message);
    res.status(500).json({ 
      ok: false, 
      error: "Falha ao enviar WhatsApp",
      details: err.message 
    });
  }
});

app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  whatsapp: {
    configured: !!(CALLMEBOT_APIKEY && PHONE_NUMBER),
    apiKey: CALLMEBOT_APIKEY ? '***' + CALLMEBOT_APIKEY.slice(-4) : 'não definido',
    phone: PHONE_NUMBER ? '***' + PHONE_NUMBER.slice(-4) : 'não definido'
  }
}));

app.post('/test/whatsapp', async (req, res) => {
  const { message = "✅ TESTE DEBUG: Sistema funcionando!" } = req.body || {};
  console.log('🧪 [DEBUG] Teste WhatsApp solicitado:', message);
  
  try {
    const result = await sendWhatsApp(message);
    return res.json({ 
      ok: true, 
      message: "Teste enviado com sucesso",
      result 
    });
  } catch (err) {
    console.error("❌ [DEBUG] Teste WhatsApp falhou:", err.message);
    return res.status(500).json({ 
      ok: false, 
      error: "Falha no teste",
      details: err.message 
    });
  }
});

// WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 [DEBUG] WS client connected');
  ws.send(JSON.stringify({ type: 'init', payload: current }));
  ws.on('message', (msg) => console.log('📩 [DEBUG] WS msg from client:', msg.toString().slice(0,200)));
  ws.on('close', () => console.log('🔌 [DEBUG] WS client disconnected'));
});

function broadcast(data) {
  const s = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(s);
  });
}

const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 5000;
setInterval(() => {
  current = simulate();
  broadcast({ type: 'sensors', payload: current });
}, INTERVAL_MS);

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 [DEBUG] Mock server running at http://0.0.0.0:${port}`);
  console.log(`📡 [DEBUG] WS endpoint ws://0.0.0.0:${port}`);
  console.log(`🔧 [DEBUG] WhatsApp: ${CALLMEBOT_APIKEY && PHONE_NUMBER ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
  
  // 👇 TESTE AUTOMÁTICO AO INICIAR
  console.log('🧪 [DEBUG] Executando teste automático...');
  setTimeout(() => {
    axios.post(`http://localhost:${port}/test/whatsapp`, {
      message: "🔧 TESTE AUTOMÁTICO: Servidor iniciado com sucesso!"
    }).then(response => {
      console.log('✅ [DEBUG] Teste automático executado:', response.data);
    }).catch(err => {
      console.error('❌ [DEBUG] Teste automático falhou:', err.message);
    });
  }, 2000);
});