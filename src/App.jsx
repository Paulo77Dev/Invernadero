// Importaciones de React y componentes
import React, { useEffect, useState, useRef } from 'react';
import styles from './styles/App.module.css';
import Header from './components/Header/Header';
import SensorDisplay from './components/SensorDisplay/SensorDisplay';
import ControlSlider from './components/ControlSlider/ControlSlider';
import ControlButton from './components/ControlButton/ControlButton';
import EventLog from './components/EventLog/EventLog';
import TimeSeriesChart from './components/TimeSeriesChart/TimeSeriesChart';
import ExportModal from './components/ExportModal/ExportModal';

// Servicios para comunicación con el backend y notificaciones
import { fetchSensors, sendControl, reportAlertToServer } from './services/espService';
import { FaTemperatureHigh, FaTint, FaWater } from 'react-icons/fa';

const MAX_HISTORY = 300;
const HISTORY_KEY = 'sensor_history_v1';
const HUMIDITY_ALERT_THRESHOLD = 70;
const HUMIDITY_LOW_ALERT_THRESHOLD = 50;

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

  // 💬 Función central para logs y notificaciones
  const addEvent = (message, type = 'info', meta = {}) => {
    const newEvent = {
      message,
      type,
      meta,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 50));

    // 🔔 Notificaciones automáticas (mantener de la versión antigua)
    if (message.includes('PARADA DE EMERGENCIA ATIVADA')) {
      reportAlertToServer({
        type: 'emergency_stop',
        level: 'critical',
        message: '🚨 PARADA DE EMERGENCIA ACTIVADA - Sistema en modo de emergencia!',
      });
    } else if (message.includes('Modo alterado')) {
      reportAlertToServer({
        type: 'normal_operations',
        level: 'info',
        message: `⚙️ ${message}`,
      });
    } else if (message.includes('Sistema pausado') || message.includes('Sistema retomado')) {
      const acao = message.includes('pausado') ? 'PAUSADO' : 'REANUDADO';
      reportAlertToServer({
        type: 'system_status',
        level: 'warning',
        message: `⏸️ Sistema ${acao} desde el panel de control`,
      });
    } else if (message.includes('Comando de emergencia enviado')) {
      reportAlertToServer({
        type: 'emergency_control',
        level: 'info',
        message: '🛑 Comando de emergencia ejecutado - Sistemas apagados',
      });
    } else if (message.includes('Histórico limpo')) {
      reportAlertToServer({
        type: 'system_action',
        level: 'info',
        message: '🗑️ Historial de datos limpiado por el usuario',
      });
    } else if (message.includes('Exportação de CSV iniciada')) {
      reportAlertToServer({
        type: 'system_action',
        level: 'info',
        message: '📊 Exportación de datos CSV iniciada',
      });
    } else if (message.includes('Comando enviado -> BOMBA DE RIEGO')) {
      const bomba = message.match(/BOMBA DE RIEGO: (\d+)%/)?.[1] || '0';
      const ventiladores = message.match(/AFICIONADOS: (\d+)%/)?.[1] || '0';
      const luzes = message.includes('LUCES: true') ? 'ENCENDIDAS' : 'APAGADAS';
      const modo = message.match(/Modo: (\w+)/)?.[1] || 'manual';
      reportAlertToServer({
        type: 'control_action',
        level: 'info',
        message: `🎛️ Controles enviados - Bomba: ${bomba}%, Ventiladores: ${ventiladores}%, Luces: ${luzes}, Modo: ${modo}`,
      });
    } else if (message.includes('ALERTA: Humidade alta detectada')) {
      const humidityValue = message.match(/(\d+)%/)?.[1] || 'desconocido';
      reportAlertToServer({
        type: 'humidity_high',
        level: 'warning',
        message: `⚠️ ALERTA: Humedad ALTA detectada - ${humidityValue}%`,
      });
    } else if (message.includes('ALERTA: Humidade baixa detectada')) {
      const humidityValue = message.match(/(\d+)%/)?.[1] || 'desconocido';
      reportAlertToServer({
        type: 'humidity_low',
        level: 'warning',
        message: `🔻 ALERTA: Humedad BAJA detectada - ${humidityValue}%`,
      });
    }
  };

  const changeMode = (newMode) => {
    const prev = prevModeRef.current ?? mode;
    if (newMode === prev) {
      addEvent(`Intento de cambiar modo al mismo valor: ${newMode} (ignorado)`, 'info');
      return;
    }
    setMode(newMode);
    addEvent(`Modo cambiado: ${prev} → ${newMode}`, 'action', { from: prev, to: newMode });
    prevModeRef.current = newMode;
  };

  // 🔹 Enviar comandos principales
  const handleSendControls = async () => {
    try {
      const payload = {
        mode,
        irrigation: Number(irrigation),
        fans: Number(fans),
        lights: !!lights,
      };
      await sendControl(payload);
      addEvent(
        `Comando enviado -> BOMBA DE RIEGO: ${payload.irrigation}%, AFICIONADOS: ${payload.fans}%, LUCES: ${payload.lights}, Modo: ${payload.mode}`,
        'action'
      );
    } catch (e) {
      addEvent('Error al enviar el control al backend', 'error');
    }
  };

  // 🆘 Parada de emergencia
  const handleEmergencyStop = async () => {
    addEvent('PARADA DE EMERGENCIA ACTIVADA', 'warning');
    setIrrigation(0);
    setFans(0);
    setLights(false);
    changeMode('manual');

    try {
      await sendControl({ command: 'EMERGENCY_STOP' });
      await sendControl({ mode: 'manual', irrigation: 0, fans: 0, lights: false, paused: true });
      setIsPaused(true);
      addEvent('Comando de emergencia enviado', 'action');
    } catch (e) {
      addEvent('Fallo al enviar emergencia', 'error');
    }
  };

  // ⏸️ Pausar / Reanudar
  const handlePauseToggle = async () => {
    const newPauseState = !isPaused;
    setIsPaused(newPauseState);
    addEvent(newPauseState ? 'Sistema pausado' : 'Sistema reanudado', 'action');

    try {
      await sendControl({ paused: newPauseState });
    } catch (e) {
      addEvent('Error al enviar comando de pausa/reanudación.', 'error');
      setIsPaused(!newPauseState);
    }
  };

  // ⚙️ Actualización periódica de sensores
  useEffect(() => {
    let active = true;
    const updateSensors = async () => {
      if (isPaused) return;
      try {
        const data = await fetchSensors();
        if (!active) return;

        setTemperature(data.temperature ?? null);
        setHumidity(data.humidity ?? null);
        setWaterLevel(data.water_level ?? null);

        const sample = {
          ts: data.ts || new Date().toISOString(),
          temperature: data.temperature,
          humidity: data.humidity,
          water_level: data.water_level,
        };
        setHistory((prev) => [...prev.slice(-MAX_HISTORY + 1), sample]);

        addEvent(
          `Datos recibidos: T:${sample.temperature ?? '-'}°C H:${sample.humidity ?? '-'}% W:${sample.water_level ?? '-'}%`,
          'success'
        );

        // 🔔 Alertas de humedad
        if (sample.humidity != null) {
          if (sample.humidity > HUMIDITY_ALERT_THRESHOLD && !humidityAlertSent.current) {
            addEvent(`ALERTA: Humedad alta detectada: ${sample.humidity}%`, 'warning');
            humidityAlertSent.current = true;
          } else if (sample.humidity < HUMIDITY_LOW_ALERT_THRESHOLD && !humidityLowAlertSent.current) {
            addEvent(`ALERTA: Humedad baja detectada: ${sample.humidity}%`, 'warning');
            humidityLowAlertSent.current = true;
          } else if (
            (sample.humidity <= HUMIDITY_ALERT_THRESHOLD && humidityAlertSent.current) ||
            (sample.humidity >= HUMIDITY_LOW_ALERT_THRESHOLD && humidityLowAlertSent.current)
          ) {
            humidityAlertSent.current = false;
            humidityLowAlertSent.current = false;
          }
        }
      } catch (e) {
        addEvent(`Fallo al obtener sensores: ${e.message}`, 'error');
      }
    };

    updateSensors();
    const interval = setInterval(updateSensors, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isPaused]);

  const handleClearHistory = () => {
    setHistory([]);
    addEvent('Historial limpiado', 'action');
  };

  const handleExport = () => {
    if (!history.length) {
      addEvent('El historial está vacío. Nada para exportar.', 'warning');
      return;
    }
    setIsExportModalOpen(true);
    addEvent('Exportación de CSV iniciada', 'action');
  };

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
          <ControlSlider label="VENTILADORES" value={fans} onChange={(e) => setFans(e.target.value)} disabled={!isManualMode || isPaused} />
          <ControlButton type="toggle" label="LUCES" active={lights} onClick={() => setLights(!lights)} disabled={!isManualMode || isPaused} />
          <ControlButton type="button" label="Enviar Controles" onClick={handleSendControls} disabled={!isManualMode || isPaused} />
          <ControlButton type="emergency" label="PARADA DE EMERGENCIA" onClick={handleEmergencyStop} />
        </div>

        <div className={styles.chartArea}>
          <TimeSeriesChart
            data={history}
            lines={[
              { key: 'temperature', name: 'Temperatura (°C)', color: 'var(--accent-red)' },
              { key: 'humidity', name: 'Humedad (%)', color: 'var(--accent-cyan)' },
              { key: 'water_level', name: 'Nivel de Agua (%)', color: 'var(--accent-green)' },
            ]}
          />
        </div>

        <div className={styles.actionsArea}>
          <button className={styles.actionButton} onClick={handleClearHistory}>
            Limpiar Historial
          </button>
          <button className={styles.actionButton} onClick={handlePauseToggle}>
            {isPaused ? 'Reanudar' : 'Pausar'}
          </button>
          <button className={styles.actionButton} onClick={handleExport}>
            Exportar CSV
          </button>
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
