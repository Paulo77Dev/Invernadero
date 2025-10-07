import React from 'react';
import styles from "../../styles/EventLog.module.css";

const EventLog = ({ events }) => {
  return (
    <div className={styles.logContainer}>
      <h2 className={styles.title}>EVENT LOG</h2>
      <div className={styles.logList}>
        {events.map((event, index) => (
          <div key={index} className={styles.logItem}>
            <div className={styles.checkbox}></div>
            <div className={styles.textContainer}>
              <p className={styles.logText}>{event.message}</p>
              <p className={styles.logTime}>{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;