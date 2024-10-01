import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CloseTurnModal.module.css";

const CloseTurnModal = ({ onClose, turnCashId, employee }) => {
  const [lastTurnReport, setLastTurnReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLastTurnReport();
  }, []);

  const fetchLastTurnReport = async () => {
    try {
      const response = await axios.get(`'https://motel1.click/api/turncash/last_turn_report/`);
      setLastTurnReport(response.data);
    } catch (error) {
      console.error("Error fetching last turn report", error);
      setError("Error al cargar el reporte del último turno.");
    }
  };

  const handleCloseTurn = async () => {
    try {
      const response = await axios.get(`https://motel1.click/api/turncash/${turnCashId}/generate_report/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Turno_${turnCashId}_reporte.pdf`);
      document.body.appendChild(link);
      link.click();

      onClose(true);
    } catch (error) {
      console.error("Error closing turn", error);
      setError("Error al cerrar el turno");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={() => onClose(false)}></div>
      <div className={styles.modalContent}>
        <button onClick={() => onClose(false)} className={styles.closeButton} aria-label="Cerrar">
          &times;
        </button>
        <div className={styles.modalBody}>
          <h3 className={styles.modalHeader}>Cerrar Turno</h3>
          {lastTurnReport && (
            <div className={styles.lastTurnReport}>
              <h4>Reporte del Último Turno</h4>
              <p>Empleado: {lastTurnReport.employee.name}</p>
              <p>Total Entradas: ${lastTurnReport.total_entradas}</p>
              <p>Total Salidas: ${lastTurnReport.total_salidas}</p>
              <p>Saldo: ${lastTurnReport.saldo}</p>
            </div>
          )}
          {!lastTurnReport && <p>No hay turnos anteriores.</p>}
          <button onClick={handleCloseTurn} className={styles.submitButton}>
            Cerrar Turno
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CloseTurnModal;
