// test-push.cjs
const axios = require('axios');
const token = process.env.PUSHBULLET_TOKEN || "o.IEz7LnRZZCcWmEeUWjyY8rNaMonm43hP";

(async () => {
  try {
    const payload = {
      type: "note",
      title: "Teste Node (genérico)",
      body: "Push via axios funcionando (envio genérico)!"
    };

    const resp = await axios.post(
      "https://api.pushbullet.com/v2/pushes",
      payload,
      { headers: { "Access-Token": token, "Content-Type": "application/json" } }
    );

    console.log("✅ Enviado (genérico)");
    console.log("status:", resp.status);
    console.log(resp.data);
  } catch (err) {
    console.error("❌ Erro:", err.response?.status, err.response?.data || err.message);
  }
})();
