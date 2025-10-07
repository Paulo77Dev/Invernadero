import styles from '../../styles/SensorDisplay.module.css';
import LineGraph from '../../assets/line-graph.svg'; // Este caminho já estava correto

const SensorDisplay = ({ label, value, unit }) => {
  return (
    <div className={styles.sensorCard}>
      <p className={styles.label}>{label}</p>
      <div className={styles.circle}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <div className={styles.graph}>
        <img src={LineGraph} alt="Line graph" />
      </div>
    </div>
  );
};

export default SensorDisplay;