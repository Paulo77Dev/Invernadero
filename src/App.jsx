// App.jsx (VERSÃO COMPLETA - TODAS AÇÕES FUNCIONANDO)

// Importações React e componentes
import React, { useEffect, useState, useRef } from 'react';
import styles from './styles/App.module.css';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import ExportModal from './components/ExportModal/ExportModal';

// Serviços para comunicação com ESP e envio de alertas
import { fetchSensors, sendControl, reportAlertToServer } from './services/espService';
import { FaTemperatureHigh, FaTint, FaWater } from 'react-icons/fa';

const MAX_HISTORY = 300;
const HISTORY_KEY = 'sensor_history_v1';
const HUMIDITY_ALERT_THRESHOLD = 80; // Limite de alerta de humidade ALTA
const HUMIDITY_LOW_ALERT_THRESHOLD = 50; // Limite de alerta de humidade BAIXA

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
  const humidityAlertSent = useRef(false);
  const humidityLowAlertSent = useRef(false);

  const addEvent = (message, type = 'info', meta = {}) => {
    const newEvent = {
      message,
      type,
      meta,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));

    // 👇 NOTIFICAÇÕES SIMPLIFICADAS - TODAS AÇÕES CONFIGURADAS
    // PARADA DE EMERGÊNCIA - Apenas UMA notificação
    if (message.includes('PARADA DE EMERGENCIA ATIVADA')) {
      reportAlertToServer({
        type: 'emergency_stop',
        level: 'critical',
        message: '🚨 PARADA DE EMERGÊNCIA ATIVADA - Sistema em modo de emergência!'
      }).catch(err => console.error('Falha notificação emergência:', err));
    }
    
    // MUDANÇA DE MODO - Apenas UMA notificação
    else if (message.includes('Modo alterado')) {
      const formattedMessage = `NORMAL OPERATIONS\n${message} ${newEvent.time}`;
      reportAlertToServer({
        type: 'normal_operations',
        level: 'info',
        message: formattedMessage
      }).catch(err => console.error('Falha notificação modo:', err));
    }
    
    // PAUSA/RETOMADA - Apenas UMA notificação
    else if (message.includes('Sistema pausado') || message.includes('Sistema retomado')) {
      const acao = message.includes('pausado') ? 'PAUSADO' : 'RETOMADO';
      reportAlertToServer({
        type: 'system_status',
        level: 'warning',
        message: `⏸️ Sistema ${acao} pelo painel de controle`
      }).catch(err => console.error('Falha notificação pausa:', err));
    }
    
    // COMANDO DE EMERGÊNCIA ENVIADO - Apenas UMA notificação
    else if (message.includes('Comando de emergência enviado')) {
      reportAlertToServer({
        type: 'emergency_control',
        level: 'info', 
        message: '🛑 Comando de emergência executado - Sistemas desligados'
      }).catch(err => console.error('Falha notificação controle emergência:', err));
    }
    
    // HISTÓRICO LIMPO
    else if (message.includes('Histórico limpo')) {
      reportAlertToServer({
        type: 'system_action',
        level: 'info',
        message: '🗑️ Histórico de dados limpo pelo usuário'
      }).catch(err => console.error('Falha notificação histórico:', err));
    }
    
    // EXPORTAÇÃO CSV
    else if (message.includes('Exportação de CSV iniciada')) {
      reportAlertToServer({
        type: 'system_action', 
        level: 'info',
        message: '📊 Exportação de dados CSV iniciada'
      }).catch(err => console.error('Falha notificação exportação:', err));
    }
    
    // ENVIAR CONTROLES (BOMBA, VENTILADORES, LUZES)
    else if (message.includes('Comando enviado -> BOMBA DE RIEGO')) {
      // Extrai os valores da mensagem
      const bomba = message.match(/BOMBA DE RIEGO: (\d+)%/)?.[1] || '0';
      const ventiladores = message.match(/AFICIONADOS: (\d+)%/)?.[1] || '0';
      const luzes = message.includes('LUCES: true') ? 'LIGADAS' : 'DESLIGADAS';
      const modo = message.match(/Modo: (\w+)/)?.[1] || 'manual';
      
      reportAlertToServer({
        type: 'control_action',
        level: 'info',
        message: `🎛️ Controles enviados - Bomba: ${bomba}%, Ventiladores: ${ventiladores}%, Luzes: ${luzes}, Modo: ${modo}`
      }).catch(err => console.error('Falha notificação controles:', err));
    }
    
    // 👇 ALERTAS DE HUMIDADE - MANTIDOS (são importantes)
    else if (message.includes('ALERTA: Humidade alta detectada')) {
      const humidityValue = message.match(/(\d+)%/)?.[1] || 'unknown';
      reportAlertToServer({
        type: 'humidity_high',
        level: 'warning',
        message: `⚠️ ALERTA: Humidade ALTA detectada - ${humidityValue}% (acima de ${HUMIDITY_ALERT_THRESHOLD}%)`
      }).catch(err => console.error('Falha notificação humidade alta:', err));
    }
    else if (message.includes('ALERTA: Humidade baixa detectada')) {
      const humidityValue = message.match(/(\d+)%/)?.[1] || 'unknown';
      reportAlertToServer({
        type: 'humidity_low',
        level: 'warning',
        message: `🔻 ALERTA: Humidade BAIXA detectada - ${humidityValue}% (abaixo de ${HUMIDITY_LOW_ALERT_THRESHOLD}%)`
      }).catch(err => console.error('Falha notificação humidade baixa:', err));
    }
  };

  const changeMode = (newMode) => {
    const prev = prevModeRef.current ?? mode;
    if (newMode === prev) {
      addEvent(`Tentativa de mudar modo para o mesmo valor: ${newMode} (ignorado)`, 'info');
      return;
    }
    setMode(newMode);
    addEvent(`Modo alterado: ${prev} → ${newMode}`, 'action', { from: prev, to: newMode });
    prevModeRef.current = newMode;
  };

  const handleSendControls = async () => {
    try {
      const payload = { mode, irrigation: Number(irrigation), fans: Number(fans), lights: !!lights };
      await sendControl(payload);
      addEvent(`Comando enviado -> BOMBA DE RIEGO: ${payload.irrigation}%, AFICIONADOS: ${payload.fans}%, LUCES: ${payload.lights ? 'ON' : 'OFF'}, Modo: ${payload.mode}`, 
        'action', { BOMBA_DE_RIEGO: payload.irrigation, AFICIONADOS: payload.fans, LUCES: payload.lights, MODO: payload.mode });
    } catch (e) {
      addEvent("Erro ao enviar o controle para o ESP", 'error');
    }
  };

  // Botão de emergência
  const handleEmergencyStop = async () => {
    addEvent("PARADA DE EMERGENCIA ATIVADA", 'warning');

    setIrrigation(0); setFans(0); setLights(false); changeMode('manual');
    try {
      await sendControl({ mode: 'manual', irrigation: 0, fans: 0, lights: false });
      addEvent("Comando de emergência enviado", 'action', { BOMBA_DE_RIEGO: 0, AFICIONADOS: 0, LUCES: false, MODO: 'manual' });
    } catch (e) {
      addEvent("Falha ao enviar emergência", 'error');
    }
  };

  // Botão Pausar / Retomar
  const handlePauseToggle = async () => {
    const newPauseState = !isPaused;
    setIsPaused(newPauseState);
    addEvent(newPauseState ? 'Sistema pausado' : 'Sistema retomado', 'action', { paused: newPauseState });

    try {
      await sendControl({ paused: newPauseState });
    } catch (e) {
      addEvent(`Erro ao enviar comando de pausa/retomada.`, 'error');
      setIsPaused(!newPauseState);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    addEvent('Histórico limpo', 'action');
  };

  const handleExport = () => {
    if (!history.length) {
      addEvent('O histórico está vazio. Nada para exportar.', 'warning');
      return;
    }
    setIsExportModalOpen(true);
    addEvent('Exportação de CSV iniciada', 'action');
  };

  // Atualização dos sensores - SEM NOTIFICAÇÕES AUTOMÁTICAS
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

        addEvent(`Dados recebidos: T:${sample.temperature ?? '-'}°C H:${sample.humidity ?? '-'}% W:${sample.water_level ?? '-'}%`, 'success');

        // 👇 APENAS ATUALIZA A TELA - NÃO ENVIA NOTIFICAÇÕES AUTOMÁTICAS

        // Lógica de alerta de humidade (ALTA e BAIXA) - MANTIDO
        if (sample.humidity != null) {
          // Alerta de humidade ALTA
          if (sample.humidity > HUMIDITY_ALERT_THRESHOLD && !humidityAlertSent.current) {
            addEvent(`ALERTA: Humidade alta detectada: ${sample.humidity}%`, 'warning');
            humidityAlertSent.current = true;
          } 
          // Alerta de humidade BAIXA
          else if (sample.humidity < HUMIDITY_LOW_ALERT_THRESHOLD && !humidityLowAlertSent.current) {
            addEvent(`ALERTA: Humidade baixa detectada: ${sample.humidity}%`, 'warning');
            humidityLowAlertSent.current = true;
          }
          // Normalização da humidade (ambos os casos)
          else if (
            (sample.humidity <= HUMIDITY_ALERT_THRESHOLD && humidityAlertSent.current) ||
            (sample.humidity >= HUMIDITY_LOW_ALERT_THRESHOLD && humidityLowAlertSent.current)
          ) {
            if (sample.humidity <= HUMIDITY_ALERT_THRESHOLD && humidityAlertSent.current) {
              addEvent(`Humidade alta normalizada: ${sample.humidity}%`, 'info');
              humidityAlertSent.current = false;
            }
            if (sample.humidity >= HUMIDITY_LOW_ALERT_THRESHOLD && humidityLowAlertSent.current) {
              addEvent(`Humidade baixa normalizada: ${sample.humidity}%`, 'info');
              humidityLowAlertSent.current = false;
            }
          }
        }

      } catch (e) {
        console.warn("fetchSensors erro:", e);
        addEvent(`Falha ao buscar sensores: ${e?.message || 'erro desconhecido'}`, 'error');
      }
    };
    getAndSet();
    const iv = setInterval(getAndSet, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [isPaused]);

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
      {isExportModalOpen && <ExportModal history={history} onClose={() => setIsExportModalOpen(false)} />}
    </>
  );
}

export default App;