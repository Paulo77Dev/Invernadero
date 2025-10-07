import React from 'react';
import styles from "../../styles/Header.module.css";

const Header = ({ mode, setMode }) => {
  return (
    <div className={styles.headerContainer}>
      <h1 className={styles.title}>SMART GREENHOUSE</h1>
      <div className={styles.modeSelector}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="mode"
            value="manual"
            checked={mode === 'manual'}
            onChange={() => setMode('manual')}
          />
          <span className={styles.radioText}>MANUAL</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="mode"
            value="automatic"
            checked={mode === 'automatic'}
            onChange={() => setMode('automatic')}
          />
          <span className={styles.radioText}>AUTOMATIC</span>
        </label>
      </div>
    </div>
  );
};

export default Header;