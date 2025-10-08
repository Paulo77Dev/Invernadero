// src/services/espService.js
const ESP_BASE = import.meta.env.VITE_ESP_URL || "http://192.168.4.1";


export async function fetchSensors() {
  const res = await fetch(`${ESP_BASE}/sensors`, { method: "GET" });
  if (!res.ok) throw new Error("Falha fetch sensors: " + res.status);
  return res.json();
}

// --- CÓDIGO EDITADO ABAIXO ---
export async function sendControl(payload) {
  // payload agora é: { mode, irrigation, fans, lights }
  const res = await fetch(`${ESP_BASE}/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // Envia o payload completo como ele vier
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error("Falha envio controle: " + res.status + " " + txt);
  }
  return res.json();
}
// --- FIM DA EDIÇÃO ---

// WebSocket helper: recebe URL ws://...
export function createSensorWebSocket(wsUrl, onMessage, onOpen, onClose) {
  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    console.error("WS init fail", e);
    return { close: ()=>{} };
  }

  ws.onopen = (ev) => { if (onOpen) onOpen(ev); };
  ws.onmessage = (ev) => {
    try { const data = JSON.parse(ev.data); if (onMessage) onMessage(data); }
    catch(e){ console.warn("WS parse fail", e); }
  };
  ws.onclose = (ev) => { if (onClose) onClose(ev); };
  ws.onerror = (e) => console.error("WS error", e);

  return {
    close: () => { try{ ws.close(); }catch{} }
  };
}