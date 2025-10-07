// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm i node-fetch@2
const app = express();
app.use(express.json());

const ESP_BASE = process.env.ESP_BASE || "http://192.168.4.1";

app.get('/api/sensors', async (req, res) => {
  try {
    const r = await fetch(`${ESP_BASE}/sensors`);
    const data = await r.text();
    res.set('Access-Control-Allow-Origin', '*');
    res.status(r.status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/control', async (req, res) => {
  try {
    const r = await fetch(`${ESP_BASE}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await r.text();
    res.status(r.status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, ()=> console.log("Proxy listening on", port, "->", ESP_BASE));
