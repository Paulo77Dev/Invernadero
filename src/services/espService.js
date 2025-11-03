// src/services/espService.js - VERSÃO CORRIGIDA
const CLOUD_API_URL = "https://invernadero.railway.app"; // 👈 SEM /api no final

let authToken = null;
let currentUser = null;

// 👇 FUNÇÕES DE AUTENTICAÇÃO (NOVAS)
export function setAuthToken(token) {
  authToken = token;
}

export function getCurrentUser() {
  return currentUser;
}

export async function loginUser(email, password) {
  try {
    const response = await fetch(`${CLOUD_API_URL}/login`, { // 👈 /login direto
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login falhou');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    currentUser = data.user;
    
    // Salvar no localStorage para persistência
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
}

export function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

// 👇 CARREGAR TOKEN SALVO (para recarregar página)
export function loadSavedAuth() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    authToken = token;
    currentUser = JSON.parse(user);
    return true;
  }
  return false;
}

// 👇 BUSCAR DADOS DO CLOUD (ATUALIZADA)
export async function fetchSensors() {
  if (!authToken) throw new Error('Não autenticado - Faça login primeiro');

  try {
    const res = await fetch(`${CLOUD_API_URL}/sensors`, { // 👈 /sensors direto
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) throw new Error(`Falha ao buscar sensores: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar sensores do cloud:", err);
    throw new Error("Servidor cloud não disponível");
  }
}

// 👇 ENVIAR COMANDOS PARA CLOUD (ATUALIZADA)
export async function sendControl(payload) {
  if (!authToken) throw new Error('Não autenticado - Faça login primeiro');

  try {
    const res = await fetch(`${CLOUD_API_URL}/control`, { // 👈 /control direto
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`Falha ao enviar controle: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao enviar controle para cloud:", err);
    throw new Error("Falha na comunicação com servidor cloud");
  }
}

// 👇 ENVIAR ALERTAS VIA CLOUD (ATUALIZADA)
export async function reportAlertToServer(payload) {
  if (!authToken) {
    console.log("⚠️ Não autenticado - Alerta registrado localmente:", payload.message);
    
    // Fallback: notificação do navegador
    if (Notification.permission === "granted") {
      new Notification(`🌱 ${payload.type}`, { body: payload.message });
    }
    return false;
  }

  try {
    const res = await fetch(`${CLOUD_API_URL}/alert`, { // 👈 /alert direto
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`Falha ao enviar alerta: ${res.status}`);
    console.log("✅ Alerta enviado para cloud/WhatsApp!");
    return true;
  } catch (err) {
    console.error("❌ Erro ao enviar alerta para cloud:", err);
    
    // Fallback: notificação do navegador
    if (Notification.permission === "granted") {
      new Notification(`🌱 ${payload.type}`, { body: payload.message });
    }
    
    return false;
  }
}

// 👇 FUNÇÃO PARA VERIFICAR CONEXÃO COM CLOUD
export async function checkCloudConnection() {
  try {
    const response = await fetch(`${CLOUD_API_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('❌ Servidor cloud offline');
    return false;
  }
}

// 👇 ENVIAR DADOS DO ESP32 PARA CLOUD (PARA O ESP32 USAR)
export async function sendDeviceData(deviceData) {
  try {
    const res = await fetch(`${CLOUD_API_URL}/device/data`, { // 👈 /device/data direto
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(deviceData)
    });
    
    if (!res.ok) throw new Error(`Falha ao enviar dados: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao enviar dados para cloud:", err);
    throw err;
  }
}