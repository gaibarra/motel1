import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-timezone";
import styles from "./Movements.module.css";

const Movements = ({ onClose }) => {
  const [currentTurnMovements, setCurrentTurnMovements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentTurnMovements();
  }, []);

  const fetchCurrentTurnMovements = async () => {
    try {
      const response = await axios.get("https://motel1.click/api/turncash/current_turn_movements/");
      setCurrentTurnMovements(response.data);
    } catch (error) {
      console.error("Error fetching current turn movements", error);
      setError("Error al cargar los movimientos del turno actual.");
    }
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };

  function formatDate(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose}></div>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeButton} aria-label="Cerrar">
          &times;
        </button>
        <div className={styles.modalBody}>
          <h4 className={styles.boldBlueText}>Movimientos del Turno Actual</h4>
          <div className={styles.movementsScrollable}>
            {currentTurnMovements.length > 0 ? (
              <table className={styles.movementsTable}>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTurnMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.date)}</td>
                      <td>{movement.movement_type}</td>
                      <td>{formatCurrency(movement.amount)}</td>
                      <td>{movement.concept}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No hay movimientos en el turno actual.</p>
            )}
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Movements;
