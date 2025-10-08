const axios = require('axios');

(async () => {
  try {
    const resp = await axios.post("http://localhost:3001/test/push", {
      title: "Teste mock-server",
      body: "Envio de teste via servidor"
    });
    console.log(resp.data);
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message);
  }
})();
