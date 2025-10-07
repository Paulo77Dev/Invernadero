// src/App.jsx
import React, { useEffect, useState, useRef } from 'react';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import { fetchSensors, sendControl, createSensorWebSocket } from './services/espService';

function App() {
  const [mode, setMode] = useState('manual');
  const [irrigation, setIrrigation] = useState(30);
  const [fans, setFans] = useState(50);
  const [lights, setLights] = useState(false);

  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [waterLevel, setWaterLevel] = useState(null);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  // polling fallback if WS não estiver disponível
  useEffect(() => {
    let mounted = true;
    const getAndSet = async () => {
      try {
        const data = await fetchSensors();
        if (!mounted) return;
        setTemperature(data.temperature ?? null);
        setHumidity(data.humidity ?? null);
        setWaterLevel(data.water_level ?? null);
      } catch (e) {
        console.warn("fetchSensors erro:", e);
      }
    };
    getAndSet();
    const iv = setInterval(getAndSet, 3000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // opcional: tentar conectar WS — se o ESP tiver ws em ws://IP/ws
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_ESP_WS || "").trim();
    if (!wsUrl) return;
    const ws = createSensorWebSocket(wsUrl,
      (data) => {
        if (data.temperature !== undefined) setTemperature(data.temperature);
        if (data.humidity !== undefined) setHumidity(data.humidity);
        if (data.water_level !== undefined) setWaterLevel(data.water_level);
        setEvents(prev => [{ message: 'Sensor update', time: new Date().toLocaleTimeString() }, ...prev].slice(0,20));
      },
      () => console.log("WS aberto"),
      () => console.log("WS fechado")
    );
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const addEvent = (msg) => {
    setEvents(prev => [{ message: msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0,50));
  };

  const handleEmergencyStop = async () => {
    addEvent("EMERGENCY STOP ACTIVATED");
    setIrrigation(0); setFans(0); setLights(false); setMode('manual');
    try {
      await sendControl({ irrigation:0, fans:0, lights:false });
      addEvent("Emergency stop enviado ao ESP");
    } catch (e) { addEvent("Falha enviar emergency: " + e.message); }
  };

  const handleSendControls = async () => {
    try {
      const payload = { irrigation: Number(irrigation), fans: Number(fans), lights: !!lights };
      await sendControl(payload);
      addEvent("Comando enviado: " + JSON.stringify(payload));
    } catch (e) {
      addEvent("Erro ao enviar controle: " + e.message);
    }
  };

  // se modo manual, atualiza controles ao mudar (ou faz um botão "Enviar")
  useEffect(() => {
    if (mode === 'manual') {
      // opcional: enviar automaticamente quando mudar sliders
      // const t = setTimeout(handleSendControls, 500);
      // return () => clearTimeout(t);
    }
  }, [irrigation, fans, lights, mode]);

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

      <EventLog events={events} />
    </div>
  );
}

export default App;
