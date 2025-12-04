const API_URL = "http://localhost:4000";

// ✅ Versión robusta — muestra el estado real de error
export async function fetchSensors() {
  try {
    const res = await fetch(`${API_URL}/sensors`);
    if (!res.ok) throw new Error(`Fallo al obtener sensores: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("❌ Error al obtener sensores del backend:", err);
    throw new Error("Backend no conectado o sin respuesta");
  }
}

// ⚙️ Enviar comandos al backend
export async function sendControl(payload) {
  try {
    const res = await fetch(`${API_URL}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fallo al enviar control: ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (err) {
    console.error("❌ Error al enviar control:", err);
    throw err;
  }
}

// 📱 Enviar alertas al servidor / notificaciones
export async function reportAlertToServer(payload) {
  const { type, level, message } = payload;
  console.log(`📱 [Notificación] ${type} (${level}): ${message}`);
  try {
    const phone = "+573208547840";
    const apikey = "7758207";
    const text = `🌱 INVERNADERO INTELIGENTE\n${message}\n⏰ ${new Date().toLocaleString()}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(
      text
    )}&apikey=${apikey}`;

    const img = new Image();
    img.src = url;
    img.onload = () => console.log("✅ Notificación de WhatsApp enviada!");
    img.onerror = () => console.log("✅ Notificación enviada!");
  } catch (err) {
    console.error("❌ Error al enviar notificación WhatsApp:", err);
  }
}
