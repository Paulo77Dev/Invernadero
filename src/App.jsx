import React, { useEffect, useState, useRef } from 'react';
import styles from './styles/App.module.css';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import ExportModal from './components/ExportModal/ExportModal';
import { fetchSensors, sendControl } from './services/espService';
import { FaTemperatureHigh, FaTint, FaWater } from 'react-icons/fa';

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const prevModeRef = useRef(mode);

  const [isPaused, setIsPaused] = useState(false);

  const sendPushNotification = async (type, level, message) => {
    try {
      const useMockServer = import.meta.env.VITE_USE_MOCK_SERVER === "true";
      const token = import.meta.env.VITE_PUSHBULLET_TOKEN || "o.QjW0w3GZtHAWMqOyBYaCbrD8PD41u7LI";

      if (useMockServer) {
        const url = `${import.meta.env.VITE_ESP_URL || "http://localhost:3001"}/report/alert`;
        const payload = { type, level, message };
        const headers = { "Content-Type": "application/json" };
        const reportKey = import.meta.env.VITE_REPORT_API_KEY || "";
        if (reportKey) headers["x-api-key"] = reportKey;
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
        if (!res.ok) { console.warn("sendPushNotification (mock): resposta não OK", res.status); } 
        else { console.log("🧪 Notificação mock enviada:", message); }
      } else {
        const resp = await fetch("https://api.pushbullet.com/v2/pushes", {
          method: "POST",
          headers: { "Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "note", title: `[${level.toUpperCase()}] ${type}`, body: message }),
        });
        if (!resp.ok) { console.warn("sendPushNotification (pushbullet): erro HTTP", resp.status); } 
        else { console.log("📲 Notificação Pushbullet enviada:", message); }
      }
    } catch (e) {
      console.error("🚫 Falha ao enviar notificação:", e);
    }
  };

  const addEvent = (message, type = 'info', meta = {}) => {
    const newEvent = { message, type, meta, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    if (type === 'error' || type === 'warning') {
      const level = type === 'error' ? 'critical' : 'warning';
      sendPushNotification(type, level, message);
    }
    if (type === 'action') {
      const metaText = meta && Object.keys(meta).length ? ' | ' + Object.entries(meta).map(([k,v]) => `${k}: ${v}`).join(', ') : '';
      sendPushNotification('activity', 'normal', `${message}${metaText}`);
    }
  };

  const changeMode = (newMode) => {
    const prev = prevModeRef.current ?? mode;
    if (newMode === prev) {
      addEvent(`Tentativa de mudar modo para o mesmo valor: ${newMode} (ignorado)`, 'info');
      return;
    }
    setMode(newMode);
    const readablePrev = String(prev);
    const readableNew = String(newMode);
    const msg = `Modo alterado: ${readablePrev} → ${readableNew}`;
    addEvent(msg, 'action', { from: readablePrev, to: readableNew });
    sendPushNotification('modeChanged', 'normal', msg);
    prevModeRef.current = newMode;
  };

  const handleSendControls = async () => {
    try {
      const payload = { mode, irrigation: Number(irrigation), fans: Number(fans), lights: !!lights };
      await sendControl(payload);
      const logMessage = `Comando enviado -> BOMBA DE RIEGO: ${payload.irrigation}%, AFICIONADOS: ${payload.fans}%, LUCES: ${payload.lights ? 'ON' : 'OFF'}, Modo: ${payload.mode}`;
      addEvent(logMessage, 'action', { BOMBA_DE_RIEGO: payload.irrigation, AFICIONADOS: payload.fans, LUCES: payload.lights, MODO: payload.mode });
      sendPushNotification('controlsSent', 'normal', `Controles enviados | BOMBA: ${payload.irrigation}% | AFICIONADOS: ${payload.fans}% | LUCES: ${payload.lights ? 'ON' : 'OFF'}`);
    } catch (e) {
      addEvent("Erro ao enviar o controle para o ESP", 'error');
      sendPushNotification('controlsError', 'critical', 'Erro ao enviar controles ao ESP');
    }
  };

  const handleEmergencyStop = async () => {
    addEvent("PARADA DE EMERGENCIA ATIVADA", 'warning');
    setIrrigation(0); setFans(0); setLights(false); changeMode('manual');
    try {
      await sendControl({ mode: 'manual', irrigation: 0, fans: 0, lights: false });
      addEvent("Comando de emergência enviado", 'action', { BOMBA_DE_RIEGO: 0, AFICIONADOS: 0, LUCES: false, MODO: 'manual' });
      sendPushNotification('emergency', 'critical', 'Parada de emergencia enviada ao ESP');
    } catch (e) { 
      addEvent("Falha ao enviar emergência", 'error'); 
      sendPushNotification('emergencyError', 'critical', 'Falha ao enviar parada de emergencia');
    }
  };

  const handlePauseToggle = async () => {
    const newPauseState = !isPaused;
    setIsPaused(newPauseState);
    const message = newPauseState ? 'Sistema pausado' : 'Sistema retomado';
    addEvent(message, 'action', { paused: newPauseState });
    
    try {
      await sendControl({ paused: newPauseState });
      sendPushNotification('pauseToggle', 'normal', `Comando '${message}' enviado ao ESP.`);
    } catch (e) {
      addEvent(`Erro ao enviar comando de pausa/retomada.`, 'error');
      sendPushNotification('pauseError', 'critical', 'Falha ao pausar/retomar o sistema no ESP.');
      setIsPaused(!newPauseState);
    }
  };
  
  const handleClearHistory = () => {
    setHistory([]);
    addEvent('Histórico limpo', 'action');
    sendPushNotification('historyCleared', 'normal', 'O histórico foi limpo.');
  };
  
  const handleExport = () => {
    if (!history.length) {
      addEvent('O histórico está vazio. Nada para exportar.', 'warning');
      return;
    }
    setIsExportModalOpen(true);
    addEvent('Exportação de CSV iniciada', 'action');
    sendPushNotification('csvExported', 'normal', `Exportação iniciada. ${history.length} registros.`);
  };

  useEffect(() => {
    let mounted = true;
    const getAndSet = async () => {
      if (isPaused) return;
      try {
        const data = await fetchSensors();
        if (!mounted) return;

        if (typeof data.is_paused === 'boolean' && data.is_paused !== isPaused) {
            setIsPaused(data.is_paused);
        }

        const sample = {
          ts: data.ts || new Date().toISOString(),
          temperature: data.temperature ?? null,
          humidity: data.humidity ?? null,
          water_level: data.water_level ?? null,
          irrigation: Number(irrigation),
          fans: Number(fans),
          lights: !!lights
        };

        setTemperature(sample.temperature);
        setHumidity(sample.humidity);
        setWaterLevel(sample.water_level);
        setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), sample]);

        addEvent(
          `Dados recebidos: T:${sample.temperature ?? '-'}°C H:${sample.humidity ?? '-'}% W:${sample.water_level ?? '-'}%`,
          'success'
        );
      } catch (e) {
        console.warn("fetchSensors erro:", e);
        const msg = `Falha ao buscar sensores: ${e?.message || 'erro desconhecido'}`;
        addEvent(msg, 'error');
        sendPushNotification('sensorFailure', 'critical', msg);
      }
    };
    
    getAndSet();
    const iv = setInterval(getAndSet, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, []); // <<< ÚNICA CORREÇÃO: `isPaused` foi removido daqui

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { console.warn('Erro salvando histórico', e); }
  }, [history]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(-MAX_HISTORY));
      }
    } catch (e) { console.warn('Não foi possível carregar histórico do localStorage', e); }
  }, []);

  const isManualMode = mode === 'manual';

  return (
    <>
      <div className={styles.dashboard}>
        <div className={styles.headerArea}>
          <Header mode={mode} setMode={changeMode} />
        </div>
        <div className={styles.sensorArea}>
          <SensorDisplay icon={<FaTemperatureHigh />} label="TEMPERATURA" value={temperature} unit="°C" /> 
          <SensorDisplay icon={<FaTint />} label="HUMEDAD RELATIVA" value={humidity} unit="%" />
          <SensorDisplay icon={<FaWater />} label="NIVEL DEL AGUA" value={waterLevel} unit="%" />
        </div>
        <div className={styles.controlsArea}>
          <ControlSlider label="BOMBA DE RIEGO" value={irrigation} onChange={(e) => setIrrigation(e.target.value)} disabled={!isManualMode || isPaused} />
          <ControlSlider label="AFICIONADOS" value={fans} onChange={(e) => setFans(e.target.value)} disabled={!isManualMode || isPaused} />
          <ControlButton type="toggle" label="LUCES" active={lights} onClick={() => setLights(!lights)} disabled={!isManualMode || isPaused} />
          <ControlButton type="button" label="Enviar Controles" onClick={handleSendControls} disabled={!isManualMode || isPaused} />
          <ControlButton type="emergency" label="PARADA DE EMERGENCIA" onClick={handleEmergencyStop} />
        </div>
        <div className={styles.chartArea}>
          <TimeSeriesChart
            data={history}
            lines={[
              { key: "temperature", name: "Temperatura (°C)", color: "var(--accent-red)" },
              { key: "humidity", name: "Humedad (%)", color: "var(--accent-cyan)" },
              { key: "water_level", name: "Nivel de Agua (%)", color: "var(--accent-green)" },
            ]}
          />
        </div>
        <div className={styles.actionsArea}>
          <button className={styles.actionButton} onClick={handleClearHistory}>Limpar Histórico</button>
          <button className={styles.actionButton} onClick={handlePauseToggle}>{isPaused ? 'Retomar' : 'Pausar'}</button>
          <button className={styles.actionButton} onClick={handleExport}>Exportar CSV</button>
          <div className={styles.sampleCount}>Demostraciones: {history.length}</div>
        </div>
        <div className={styles.logsArea}>
          <EventLog events={events} />
        </div>
      </div>
      {isExportModalOpen && (
        <ExportModal 
          history={history} 
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}
    </>
  );
}

export default App;