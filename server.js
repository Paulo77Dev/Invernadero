const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_super_secreto_aqui';
const CALLMEBOT_KEY = process.env.CALLMEBOT_APIKEY;
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;

// 👇 "Banco de dados" em memória (usuários e dados)
const users = [
  {
    id: 1,
    email: "admin@estufa.com",
    password: bcrypt.hashSync("123456", 10), // Senha: 123456
    name: "Administrador",
    devices: ["ESP32-CASA-001"]
  }
];

const greenhouseData = {}; // Armazena dados dos ESP32

// 👇 FUNÇÃO WHATSAPP (mantida)
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

// 👇 MIDDLEWARE DE AUTENTICAÇÃO
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// 👇 ROTA DE LOGIN (NOVA)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email 
    } 
  });
});

// 👇 ROTA PARA ESP32 ENVIAR DADOS (NOVA)
app.post('/api/device/data', (req, res) => {
  const { deviceId, temperature, humidity, waterLevel } = req.body;
  
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId é obrigatório' });
  }

  // Inicializar dados do dispositivo se não existir
  if (!greenhouseData[deviceId]) {
    greenhouseData[deviceId] = [];
  }
  
  // Adicionar novo registro
  greenhouseData[deviceId].push({
    timestamp: new Date().toISOString(),
    temperature,
    humidity,
    waterLevel
  });

  // Manter apenas últimos 100 registros
  if (greenhouseData[deviceId].length > 100) {
    greenhouseData[deviceId] = greenhouseData[deviceId].slice(-100);
  }

  console.log(`📊 Dados recebidos de ${deviceId}:`, { temperature, humidity, waterLevel });
  res.json({ status: 'success', message: 'Dados recebidos' });
});

// 👇 ROTA PARA APLICAÇÃO BUSCAR DADOS (PROTEGIDA)
app.get('/api/greenhouse/data', authenticateToken, (req, res) => {
  // Por enquanto retorna dados do primeiro dispositivo do usuário
  // Depois você associa dispositivos específicos a cada usuário
  const deviceId = "ESP32-CASA-001";
  const data = greenhouseData[deviceId] || [];
  
  res.json({
    deviceId,
    current: data[data.length - 1] || { temperature: null, humidity: null, waterLevel: null },
    history: data.slice(-50)
  });
});

// 👇 ROTA PARA ENVIAR COMANDOS (PROTEGIDA)
app.post('/api/greenhouse/control', authenticateToken, (req, res) => {
  const { irrigation, fans, lights, mode } = req.body;
  
  console.log('🎛️ Comando recebido:', { irrigation, fans, lights, mode });
  
  // Aqui você implementaria o envio real para o ESP32
  // Por enquanto só registra o comando
  res.json({ 
    status: 'success', 
    message: 'Comando recebido (modo simulação)',
    executed: { irrigation, fans, lights, mode }
  });
});

// 👇 ROTAS ORIGINAIS (mantidas para compatibilidade)
app.get('/api/sensors', authenticateToken, async (req, res) => {
  try {
    // Retorna dados do storage interno em vez do ESP32 direto
    const deviceId = "ESP32-CASA-001";
    const data = greenhouseData[deviceId] || [];
    const current = data[data.length - 1] || { temperature: null, humidity: null, waterLevel: null };
    
    res.json({
      device_id: deviceId,
      ts: Date.now(),
      temperature: current.temperature,
      humidity: current.humidity,
      water_level: current.waterLevel,
      battery: 3.7,
      is_paused: false
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/control', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Comando recebido (legado):', req.body);
    res.json({ 
      ok: true, 
      received: req.body,
      message: 'Comando processado em modo cloud'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 👇 ROTA WHATSAPP (PROTEGIDA)
app.post('/api/alert', authenticateToken, async (req, res) => {
  const { type, level, message } = req.body;
  let msg = `⚠️ ALERTA (${level?.toUpperCase()}): ${message}`;
  if (type === 'emergency_stop') msg = `🛑 EMERGÊNCIA: ${message}`;
  if (type === 'system_paused') msg = `⏸️ PAUSADO: ${message}`;
  if (type === 'system_resumed') msg = `▶️ RETOMADO: ${message}`;
  
  await sendWhatsApp(msg);
  res.json({ ok: true });
});

// 👇 ROTA DE SAÚDE 
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'estufa-cloud',
    timestamp: new Date().toISOString()
  });
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`🚀 Servidor Cloud Estufa rodando na porta ${process.env.PORT || 4000}`);
  console.log(`📧 Login: admin@estufa.com | Senha: 123456`);
});