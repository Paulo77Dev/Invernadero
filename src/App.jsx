import React, { useEffect, useState, useRef } from 'react';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import { fetchSensors, sendControl, createSensorWebSocket } from './services/espService';

const MAX_HISTORY = 300;
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

  // client-side dedupe for reporting (avoid spamming server)
  const lastReportedRef = useRef({}); // type -> timestamp
  const CLIENT_REPORT_COOLDOWN = Number(import.meta.env.VITE_ALERT_CLIENT_COOLDOWN_MS) || 60_000;

  // load / save history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(-MAX_HISTORY));
      }
    } catch (e) { console.warn('Não foi possível carregar histórico do localStorage', e); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { console.warn('Erro salvando histórico', e); }
  }, [history]);

  const pushSample = (sample) => {
    if (pausedRef.current) return;
    setHistory(prev => {
      const next = prev.length >= MAX_HISTORY ? prev.slice(prev.length - (MAX_HISTORY - 1)) : prev;
      return [...next, sample];
    });
  };

  const addEvent = (msg) => {
    setEvents(prev => [{ message: msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0,50));
  };

  // polling fallback
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
      }
    };
    getAndSet();
    const iv = setInterval(getAndSet, 30000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // websocket push
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_ESP_WS || "").trim();
    if (!wsUrl) return;
    const ws = createSensorWebSocket(wsUrl,
      (msg) => {
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
      () => { console.log('WS aberto', wsUrl); addEvent('WS conectado'); },
      () => { console.log('WS fechado'); addEvent('WS desconectado'); }
    );
    wsRef.current = ws;
    return () => { try { ws.close(); } catch{} };
  }, []);

  // reportAlert: envia /report/alert ao servidor (usa header x-api-key se VITE_REPORT_API_KEY estiver definido)
  async function reportAlert(type, level, message, sample = null) {
    try {
      const now = Date.now();
      const last = lastReportedRef.current[type] || 0;
      if (now - last < CLIENT_REPORT_COOLDOWN) {
        console.log('[UI] reportAlert skipped by client cooldown', type);
        return;
      }
      lastReportedRef.current[type] = now;

      const base = import.meta.env.VITE_ESP_URL || "http://localhost:3001";
      const url = `${base}/report/alert`;
      const body = { type, level, message, sample };
      const headers = { 'Content-Type': 'application/json' };
      const reportKey = import.meta.env.VITE_REPORT_API_KEY || "";
      if (reportKey) headers['x-api-key'] = reportKey;

      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await resp.json().catch(()=>null);
      console.log('[UI] reportAlert result', resp.status, json);
      addEvent(`Report sent: ${type} (${level})`);
    } catch (e) {
      console.warn('[UI] falha ao reportar alert', e);
      addEvent(`Falha report alert ${type}: ${e.message}`);
    }
  }

  // detection: on history changes detect anomalies
  useEffect(() => {
    if (!history || history.length === 0) return;
    const last = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;

    const TEMP_LIMIT = Number(import.meta.env.VITE_ALERT_TEMP_THRESHOLD) || 35;
    const WATER_LIMIT = Number(import.meta.env.VITE_ALERT_WATER_THRESHOLD) || 20;

    if (last.temperature != null && last.temperature > TEMP_LIMIT) {
      reportAlert('tempHigh', 'critical', `Temperatura alta: ${last.temperature} °C`, last);
    }

    if (last.water_level != null && last.water_level < WATER_LIMIT) {
      reportAlert('waterLow', 'critical', `Nível de água baixo: ${last.water_level}%`, last);
    }

    if (prev && last.temperature != null && prev.temperature != null) {
      const delta = Math.abs(last.temperature - prev.temperature);
      if (delta > 8) reportAlert('tempSpike', 'warning', `Variação brusca: ${prev.temperature} -> ${last.temperature}`, { prev, last });
    }

    const recentNulls = history.slice(-5).filter(s => (s.temperature === null && s.humidity === null)).length;
    if (recentNulls >= 3) reportAlert('sensorMissing', 'critical', 'Sensor com leituras nulas repetidas', { recentNulls });

  }, [history]);

  // staleness check
  useEffect(() => {
    const CHECK_MS = Number(import.meta.env.VITE_ALERT_UI_NOUPDATE_MS) || 15_000;
    const iv = setInterval(() => {
      if (!history.length) return;
      const last = history[history.length - 1];
      const lastTs = new Date(last.ts).getTime();
      const now = Date.now();
      if (now - lastTs > CHECK_MS) {
        reportAlert('noUpdate', 'warning', `Sem atualizações no cliente há ${(now - lastTs)/1000}s`, last);
      }
    }, Math.min(5000, CHECK_MS));
    return () => clearInterval(iv);
  }, [history]);

  // controls
  const handleSendControls = async () => {
    try {
      const payload = { mode, irrigation: Number(irrigation), fans: Number(fans), lights: !!lights };
      await sendControl(payload);
      addEvent("Comando enviado: " + JSON.stringify(payload));
    } catch (e) {
      addEvent("Erro ao enviar controle: " + e.message);
    }
  } // Ponto e vírgula removido daqui

  const handleEmergencyStop = async () => {
    addEvent("EMERGENCY STOP ACTIVATED");
    setIrrigation(0); setFans(0); setLights(false); setMode('manual');
    try {
      await sendControl({ mode: 'manual', irrigation: 0, fans: 0, lights: false });
      addEvent("Emergency stop enviado ao ESP");
    } catch (e) { addEvent("Falha ao enviar emergency: " + e.message); }
  } // Ponto e vírgula removido daqui

  const handlePauseToggle = () => { pausedRef.current = !pausedRef.current; addEvent(pausedRef.current ? 'Histórico pausado' : 'Histórico retomado'); };
  const handleClearHistory = () => { setHistory([]); addEvent('Histórico limpo'); };
  const exportCSV = () => {
    if (!history.length) return;
    const header = ["ts","temperature","humidity","water_level"];
    const rows = history.map(r => [r.ts, r.temperature, r.humidity, r.water_level].join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `history_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`; a.click(); URL.revokeObjectURL(url);
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

      <div style={{ marginTop: 16 }}>
        <button
          onClick={async () => {
            try {
              console.log('[UI] trigger /test/push');
              const res = await fetch(`${import.meta.env.VITE_ESP_URL || 'http://localhost:3001'}/test/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Teste via UI', body: 'Disparo de teste pelo frontend' })
              });
              console.log('[UI] response status', res.status);
              const json = await res.json().catch(()=>null);
              console.log('[UI] response body', json);
              alert('Requisição enviada — veja console para detalhes');
            } catch (err) {
              console.error('[UI] erro no fetch /test/push', err);
              alert('Erro no fetch — veja console');
            }
          }}
        >
          Teste push via UI
        </button>
      </div>
    </div>
  );
}

export default App;