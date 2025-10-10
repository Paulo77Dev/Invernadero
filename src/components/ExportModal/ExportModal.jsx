import React from 'react';
import styles from '../../styles/ExportModal.module.css';
import { FaDownload, FaCopy, FaTimes } from 'react-icons/fa';

const ExportModal = ({ history, onClose }) => {
  
  const generateCSV = () => {
    if (!history.length) return "";
    const header = ["ts", "temperature", "humidity", "water_level"];
    const rows = history.map(r => [r.ts, r.temperature ?? '', r.humidity ?? '', r.water_level ?? ''].join(","));
    return [header.join(","), ...rows].join("\n");
  };

  const handleDownload = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose(); // Fecha o modal após o download
  };

  const handleCopy = () => {
    const csv = generateCSV();
    navigator.clipboard.writeText(csv).then(() => {
      alert('Dados copiados para a área de transferência!');
      onClose();
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2><FaDownload /> Exportar Dados do Histórico</h2>
          <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        
        <div className={styles.content}>
          <p>Pré-visualização dos dados a serem exportados.</p>
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Temperatura</th>
                  <th>Umidade</th>
                  <th>Nível Água</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index}>
                    <td>{new Date(item.ts).toLocaleString()}</td>
                    <td>{item.temperature ?? 'N/A'}</td>
                    <td>{item.humidity ?? 'N/A'}</td>
                    <td>{item.water_level ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={handleDownload} className={styles.actionButton}>
            <FaDownload /> Baixar .CSV
          </button>
          <button onClick={handleCopy} className={`${styles.actionButton} ${styles.secondary}`}>
            <FaCopy /> Copiar Dados
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;