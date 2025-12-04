import express from "express";
import cors from "cors";
import { SerialPort, ReadlineParser } from "serialport";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Puerto serial
const SERIAL_PORT = process.env.SERIAL_PORT || "COM10";
const SERIAL_BAUD = 115200;

let lastData = {
  water_level: 0,
  temperature: 0,
  humidity: 0,
  ts: new Date().toISOString(),
};

const port = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUD });
const parser = new ReadlineParser();
port.pipe(parser);

port.on("open", () =>
  console.log(`🔌 Puerto serial abierto: ${SERIAL_PORT} @ ${SERIAL_BAUD}`)
);
port.on("error", (err) => console.error("❌ Error serial:", err.message));

// 📥 Lectura de datos desde el Arduino
parser.on("data", (line) => {
  console.log("📥 Datos crudos:", line);
  const regex =
    /Volume:\s*(\d+)%\s*\|\s*Temp:\s*([\d.]+)\s*°C\s*\|\s*Umidade:\s*([\d.]+)\s*%/;
  const match = line.match(regex);

  if (match) {
    lastData = {
      water_level: Number(match[1]),
      temperature: Number(match[2]),
      humidity: Number(match[3]),
      ts: new Date().toISOString(),
    };
    io.emit("sensor_data", lastData); // 🔔 Emite datos a los clientes conectados
  }
});

// 🖥 Endpoint para obtener datos actuales
app.get("/sensors", (req, res) => res.json(lastData));

// ✅ Acepta `command` o payload completo — sin error 400
app.post("/control", (req, res) => {
  console.log("📨 Recibido en backend:", req.body);
  const { lights, irrigation, fans, mode, paused, command } = req.body;
  let comandos = [];

  if (command) comandos.push(command);

  if (paused === true) comandos.push("PAUSE");
  if (paused === false) comandos.push("RESUME");

  if (typeof lights !== "undefined") comandos.push(lights ? "LUZ_ON" : "LUZ_OFF");
  if (typeof irrigation !== "undefined") comandos.push(`IRRIGACION_${irrigation}`);
  if (typeof fans !== "undefined") comandos.push(`VENTILADOR_${fans}`);
  if (typeof mode !== "undefined") comandos.push(`MODO_${mode.toUpperCase()}`);

  if (comandos.length === 0) {
    console.warn("⚠️ Ningún comando válido recibido:", req.body);
    return res.status(200).json({ ok: true, comandos: [] }); // ✅ no rompe el frontend
  }

  const comandoFinal = comandos.join(";");
  port.write(comandoFinal + "\n", (err) => {
    if (err) {
      console.error("❌ Error al enviar comando:", err.message);
      return res.status(500).json({ error: "Fallo al enviar comando" });
    }
    console.log(`📤 Comando(s) enviado(s): ${comandoFinal}`);
    res.json({ ok: true, comandos });
  });
});

// 🏠 Endpoint principal
app.get("/", (req, res) =>
  res.json({
    message: "API del Invernadero en funcionamiento",
    timestamp: new Date().toISOString(),
  })
);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
