const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 👇 ROTA RAIZ - SEMPRE FUNCIONA
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Estufa Cloud API está funcionando!',
    status: 'online',
    service: 'estufa-cloud',
    timestamp: new Date().toISOString()
  });
});

// 👇 ROTA DE SAÚDE
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'estufa-cloud',
    timestamp: new Date().toISOString()
  });
});

// 👇 ROTA SIMPLES PARA TESTE
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ API test route working!',
    data: { temperature: 25, humidity: 60 },
    timestamp: new Date().toISOString()
  });
});

// 👇 ROTA PARA ESP32 ENVIAR DADOS
app.post('/api/device/data', (req, res) => {
  const { deviceId, temperature, humidity, waterLevel } = req.body;
  
  console.log(`📊 Dados recebidos de ${deviceId || 'unknown'}:`, { 
    temperature, 
    humidity, 
    waterLevel 
  });
  
  res.json({ 
    status: 'success', 
    message: 'Dados recebidos na cloud',
    received: { deviceId, temperature, humidity, waterLevel }
  });
});

// 👇 ROTA PARA WHATSAPP (SIMPLIFICADA)
app.post('/api/alert', async (req, res) => {
  const { message } = req.body;
  
  console.log('📱 Tentando enviar WhatsApp:', message);
  
  // Simulação - sempre retorna sucesso por enquanto
  res.json({ 
    status: 'success', 
    message: 'Notificação processada',
    alert: message
  });
});

// 👇 ROTA DE LOGIN SIMPLES
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@estufa.com' && password === '123456') {
    res.json({ 
      status: 'success',
      message: 'Login realizado',
      user: { name: 'Administrador', email: email }
    });
  } else {
    res.status(401).json({ 
      status: 'error',
      message: 'Credenciais inválidas' 
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor SIMPLES rodando na porta ${PORT}`);
  console.log(`📧 Login: admin@estufa.com | Senha: 123456`);
  console.log(`🌐 URL: https://invernadero.railway.app`);
});