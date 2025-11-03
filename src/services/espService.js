// src/services/espService.js — VERSÃO CORRIGIDA
const API_URL = "http://localhost:4000";

/**
 * safeJson()
 * Faz parse seguro do JSON retornado
 */
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

/**
 * fetchSensors()
 * Busca os dados dos sensores
 */
export async function fetchSensors() {
  try {
    const res = await fetch(`${API_URL}/sensors`, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`Falha fetch sensors: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar sensores:", err);
    throw err;
  }
}

/**
 * sendControl()
 * Envia comandos de controle (bomba, ventiladores, luzes)
 */
export async function sendControl(payload) {
  try {
    const res = await fetch(`${API_URL}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Falha envio controle: ${res.status}`);
    return safeJson(res);
  } catch (err) {
    console.error("Erro ao enviar controle:", err);
    throw err;
  }
}

/**
 * reportAlertToServer()
 * ENVIA PARA O BACKEND QUE ENVIA O WHATSAPP
 */
export async function reportAlertToServer(payload) {
  const { type, level, message } = payload;
  console.log(`[Notificação] ${type} (${level}): ${message}`);

  try {
    const res = await fetch(`${API_URL}/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, level, message })
    });
    
    if (!res.ok) throw new Error(`Falha HTTP ${res.status}`);
    console.log("✅ Notificação enviada para o backend!");
    return true;
  } catch (err) {
    console.error("❌ Erro ao enviar notificação:", err);
    throw err;
  }
}