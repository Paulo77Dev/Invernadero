// test-push.js
const axios = require('axios');
const token = process.env.PUSHBULLET_TOKEN || "o.QjW0w3GZtHAWMqOyBYaCbrD8PD41u7LI";

(async () => {
  try {
    const resp = await axios.post(
      "https://api.pushbullet.com/v2/pushes",
      { type: "note", title: "Teste Node", body: "Push via axios funcionando!" },
      { headers: { "Access-Token": token, "Content-Type": "application/json" } }
    );
    console.log("status:", resp.status);
    console.log(resp.data);
  } catch (err) {
    console.error("erro:", err.response?.status, err.response?.data || err.message);
  }
})();
// node test-push.js