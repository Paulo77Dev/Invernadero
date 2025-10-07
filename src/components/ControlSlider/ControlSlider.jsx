import React from 'react';
import styles from "../../styles/ControlSlider.module.css";

const ControlSlider = ({ label, value, onChange, disabled }) => {
  return (
    <div className={styles.sliderContainer}>
      <label className={styles.label}>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={onChange}
        className={styles.slider}
        disabled={disabled}
      />
    </div>
  );
};

export default ControlSlider;