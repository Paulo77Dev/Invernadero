import styles from "../../styles/ControlButton.module.css";

const ControlButton = ({ label, type = 'toggle', active, onClick, disabled }) => {
  if (type === 'emergency') {
    return (
      <button className={`${styles.button} ${styles.emergency}`} onClick={onClick}>
        {label}
      </button>
    );
  }

  return (
    <div className={styles.toggleContainer}>
      <span className={styles.label}>{label}</span>
      <label className={styles.switch}>
        <input type="checkbox" checked={active} onChange={onClick} disabled={disabled} />
        <span className={`${styles.slider} ${styles.round}`}></span>
      </label>
    </div>
  );
};

export default ControlButton;