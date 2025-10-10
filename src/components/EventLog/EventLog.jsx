// src/components/EventLog/EventLog.jsx (VERSÃO CORRIGIDA)

import React from 'react';
import styles from '../../styles/EventLog.module.css'; 
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';

const eventConfig = {
  success: { icon: <FaCheckCircle /> },
  warning: { icon: <FaExclamationTriangle /> },
  error: { icon: <FaTimesCircle /> },
};

const LogItem = ({ event }) => {
  const config = eventConfig[event.type] || {};
  return (
    <div className={`${styles.logItem} ${styles[event.type]}`}>
      {config.icon && <span className={styles.icon}>{config.icon}</span>}
      <span className={styles.message}>{event.message}</span>
      <span className={styles.time}>{event.time}</span>
    </div>
  );
};

const EventLog = ({ events = [] }) => {
  const errorsAndWarnings = events.filter(e => e.type === 'error' || e.type === 'warning');
  const normalOperations = events.filter(e => e.type === 'success' || e.type === 'info' || e.type === 'action');

  return (
    <div className={styles.logsContainer}>
      
      {/* Coluna de Alertas e Erros */}
      <div className={styles.logColumn}>
        <h3 className={styles.columnTitle}>ACTIVITY LOG</h3>
        <div className={styles.logList}>
          {errorsAndWarnings.length > 0 ? (
            errorsAndWarnings.map((event, index) => <LogItem key={index} event={event} />)
          ) : (
            <p className={styles.emptyLog}>No alerts.</p>
          )}
        </div>
      </div>

      {/* Coluna de Log de Operação */}
      <div className={styles.logColumn}>
        <h3 className={styles.columnTitle}>NORMAL OPERATIONS</h3>
        <div className={styles.logList}>
          {normalOperations.length > 0 ? (
            normalOperations.map((event, index) => <LogItem key={index} event={event} />)
          ) : (
            <p className={styles.emptyLog}>Waiting for events...</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default EventLog;