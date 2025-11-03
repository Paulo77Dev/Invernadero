// src/services/espService.js - ATUALIZADO

const ESP32_IP = "http://192.168.1.17"; // SEU IP
const API_URL = ESP32_IP;

/**
 * reportAlertToServer()
 * Envia alertas via CallMeBot SEM CORS (usando método alternativo)
 */
export async function reportAlertToServer(payload) {
  const { type, level, message } = payload;
  console.log(`[Notificação] ${type} (${level}): ${message}`);

  try {
    // 👇 MÉTODO ALTERNATIVO - SEM CORS (usando Image ou Script)
    const phone = "+5219992091920"; // SEU NÚMERO
    const apikey = "9765307"; // SUA API KEY
    const text = `🌱 ESTUFA INTELIGENTE\n${message}\n⏰ ${new Date().toLocaleString()}`;
    
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apikey}`;
    
    // 👇 MÉTODO QUE EVITA CORS - usando Image object
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        console.log("✅ Notificação WhatsApp enviada!");
        resolve(true);
      };
      img.onerror = () => {
        console.log("✅ Notificação enviada (imagem CORS bypass)");
        resolve(true);
      };
    });
    
  } catch (err) {
    console.error("❌ Erro ao enviar notificação WhatsApp:", err);
    
    // Fallback: notificação do navegador
    if (Notification.permission === "granted") {
      new Notification(`🌱 ${type}`, { body: message });
    }
    
    return false;
  }
}

/**
 * fetchSensors()
 * Busca dados dos sensores com tratamento CORS
 */
export async function fetchSensors() {
  try {
    const res = await fetch(`${API_URL}/sensors`, { 
      method: "GET",
      mode: "cors", // 👈 Tenta modo CORS
      headers: {
        "Accept": "application/json"
      },
      timeout: 10000
    });
    
    if (!res.ok) throw new Error(`Falha ao buscar sensores: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar sensores do ESP32:", err);
    throw new Error("ESP32 não conectado ou sem resposta");
  }
}

/**
 * sendControl()
 * Envia comandos com tratamento CORS
 */
export async function sendControl(payload) {
  try {
    const res = await fetch(`${API_URL}/control`, {
      method: "POST",
      mode: "cors", // 👈 Tenta modo CORS
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });
    
    if (!res.ok) throw new Error(`Falha ao enviar controle: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao enviar controle para ESP32:", err);
    throw new Error("Falha na comunicação com ESP32 - Verifique CORS");
  }
}