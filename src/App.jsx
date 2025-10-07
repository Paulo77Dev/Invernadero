// src/App.jsx
import React, { useEffect, useState, useRef } from 'react';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import { fetchSensors, sendControl, createSensorWebSocket } from './services/espService';

const MAX_HISTORY = 300; // número máximo de amostras a manter
const HISTORY_KEY = 'sensor_history_v1';

function App() {
  const [mode, setMode] = useState('manual');
  const [irrigation, setIrrigation] = useState(30);
  const [fans, setFans] = useState(50);
  const [lights, setLights] = useState(false);

  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [waterLevel, setWaterLevel] = useState(null);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const pausedRef = useRef(false);
  const wsRef = useRef(null);

  // carrega histórico salvo no localStorage ao iniciar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(-MAX_HISTORY));
      }
    } catch (e) {
      console.warn('Não foi possível carregar histórico do localStorage', e);
    }
  }, []);

  // salva histórico no localStorage sempre que muda
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Erro salvando histórico', e);
    }
  }, [history]);

  // helper: adiciona amostra ao histórico respeitando MAX_HISTORY e pause
  const pushSample = (sample) => {
    if (pausedRef.current) return;
    setHistory(prev => {
      const next = prev.length >= MAX_HISTORY ? prev.slice(prev.length - (MAX_HISTORY - 1)) : prev;
      return [...next, sample];
    });
  };

  // adiciona evento ao event log
  const addEvent = (msg) => {
    setEvents(prev => [{ message: msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0,50));
  };

  // polling fallback para garantir leituras periódicas
  useEffect(() => {
    let mounted = true;
    const getAndSet = async () => {
      try {
        const data = await fetchSensors();
        if (!mounted) return;
        const sample = {
          ts: data.ts || new Date().toISOString(),
          temperature: data.temperature ?? null,
          humidity: data.humidity ?? null,
          water_level: data.water_level ?? null
        };
        setTemperature(sample.temperature);
        setHumidity(sample.humidity);
        setWaterLevel(sample.water_level);
        pushSample(sample);
      } catch (e) {
        console.warn("fetchSensors erro:", e);
        // não adicionar evento de erro sempre para não floodar o log
      }
    };
    getAndSet();
    const iv = setInterval(getAndSet, 30000); // polling a cada 30s
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // WebSocket (push em tempo real). Usa createSensorWebSocket do espService
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_ESP_WS || "").trim();
    if (!wsUrl) return;

    const ws = createSensorWebSocket(wsUrl,
      (msg) => {
        // mensagem pode ser { type: 'sensors', payload: {...} } ou o próprio objecto de leitura
        const obj = (msg && msg.payload) ? msg.payload : msg;
        if (!obj) return;
        const sample = {
          ts: obj.ts || new Date().toISOString(),
          temperature: obj.temperature ?? null,
          humidity: obj.humidity ?? null,
          water_level: obj.water_level ?? null
        };
        if (sample.temperature !== null) setTemperature(sample.temperature);
        if (sample.humidity !== null) setHumidity(sample.humidity);
        if (sample.water_level !== null) setWaterLevel(sample.water_level);
        pushSample(sample);
        addEvent('Sensor update');
      },
      () => {
        console.log('WS aberto', wsUrl);
        addEvent('WS conectado');
      },
      () => {
        console.log('WS fechado');
        addEvent('WS desconectado');
      }
    );

    wsRef.current = ws;
    return () => { try { ws.close(); } catch{} };
  }, []);

  // controle de envio para ESP
  const handleSendControls = async () => {
    try {
      const payload = { irrigation: Number(irrigation), fans: Number(fans), lights: !!lights };
      await sendControl(payload);
      addEvent("Comando enviado: " + JSON.stringify(payload));
    } catch (e) {
      addEvent("Erro ao enviar controle: " + e.message);
    }
  };

  const handleEmergencyStop = async () => {
    addEvent("EMERGENCY STOP ACTIVATED");
    setIrrigation(0); setFans(0); setLights(false); setMode('manual');
    try {
      await sendControl({ irrigation:0, fans:0, lights:false });
      addEvent("Emergency stop enviado ao ESP");
    } catch (e) { addEvent("Falha enviar emergency: " + e.message); }
  };

  // pausa / retoma histórico
  const handlePauseToggle = () => {
    pausedRef.current = !pausedRef.current;
    addEvent(pausedRef.current ? 'Histórico pausado' : 'Histórico retomado');
  };

  // limpa histórico
  const handleClearHistory = () => {
    setHistory([]);
    addEvent('Histórico limpo');
  };

  // exporta CSV do histórico atual
  const exportCSV = () => {
    if (!history.length) return;
    const header = ["ts","temperature","humidity","water_level"];
    const rows = history.map(r => [r.ts, r.temperature, r.humidity, r.water_level].join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addEvent('Histórico exportado (CSV)');
  };

  const isManualMode = mode === 'manual';

  return (
    <div style={{ padding: 16 }}>
      <Header mode={mode} setMode={setMode} />
      <div style={{ display:'flex', gap:20, marginTop:16 }}>
        <SensorDisplay label="TEMPERATURE" value={temperature ?? "-"} unit="°C" />
        <SensorDisplay label="RELATIVE HUMIDITY" value={humidity ?? "-"} unit="%" />
        <SensorDisplay label="WATER LEVEL" value={waterLevel ?? "-"} unit="%" />
      </div>

      <div style={{ marginTop:20 }}>
        <ControlSlider label="IRRIGATION PUMP" value={irrigation} onChange={(e)=>setIrrigation(e.target.value)} disabled={!isManualMode} />
        <ControlSlider label="FANS" value={fans} onChange={(e)=>setFans(e.target.value)} disabled={!isManualMode} />
        <ControlButton label="LIGHTS" type="toggle" active={lights} onClick={()=>setLights(!lights)} disabled={!isManualMode} />
        <button onClick={handleSendControls} disabled={!isManualMode} style={{ marginLeft: 8 }}>Enviar controles</button>
        <ControlButton label="EMERGENCY STOP" type="emergency" onClick={handleEmergencyStop} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 18 }}>
        <button onClick={handleClearHistory}>Limpar histórico</button>
        <button onClick={handlePauseToggle}>{pausedRef.current ? 'Retomar' : 'Pausar'}</button>
        <button onClick={exportCSV}>Exportar CSV</button>
        <div style={{ marginLeft: "auto" }}>Amostras: {history.length}</div>
      </div>

      <TimeSeriesChart
        data={history}
        lines={[
          { key: "temperature", name: "Temperatura (°C)", color: "#ff4d4f" },
          { key: "humidity", name: "Umidade (%)", color: "#1890ff" },
          { key: "water_level", name: "Nível Água (%)", color: "#52c41a" },
        ]}
      />

      <EventLog events={events} />
    </div>
  );
}

export default App;
