import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import Swal from "sweetalert2";
import styles from "./TurnCashModal.module.css";
import Movements from "./Movements";

const TurnCashModal = ({ onClose }) => {
  const [responsible, setResponsible] = useState("");
  const [turnAmount, setTurnAmount] = useState(""); 
  const [turnDescription, setTurnDescription] = useState(""); 
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [lastTurnReport, setLastTurnReport] = useState(null);
  const [showMovements, setShowMovements] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchLastTurnReport();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get("https://motel1.click/api/employees/");
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees", error);
      setError("Error al cargar la lista de responsables.");
    }
  };

  const fetchLastTurnReport = async () => {
    try {
      const response = await axios.get("https://motel1.click/api/turncash/last_turn_report/");
      setLastTurnReport(response.data);
      if (response.data) {
        setTurnAmount(response.data.saldo);
        setTurnDescription(response.data.turn_description || "");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setLastTurnReport(null);
      } else {
        console.error("Error fetching last turn report", error);
        setError("Error al cargar el reporte del último turno.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!turnAmount || !responsible) {
      setError("Por favor, complete todos los campos requeridos.");
      return;
    }

    const turnCashData = {
      employee: responsible,
      turn_time: moment().tz('America/Hermosillo').toISOString(),
      turn_amount: turnAmount,
      turn_description: turnDescription,
    };

    try {
      await axios.post("https://motel1.click/api/turncash/", turnCashData);
      Swal.fire({
        title: 'Nuevo turno creado',
        text: 'El nuevo turno se ha creado exitosamente.',
        icon: 'success',
        confirmButtonText: 'OK'
      });
      onClose(true);
    } catch (error) {
      console.error("Error creating TurnCash record", error);
      setError("Error al crear el registro de TurnCash");
    }
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('YYYY-MM-DD HH:mm:ss');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={() => onClose(false)}></div>
      <div className={styles.modalContent}>
        <button onClick={() => onClose(false)} className={styles.closeButton} aria-label="Cerrar">
          &times;
        </button>
        <div className={styles.modalBody}>
          {lastTurnReport && (
            <div className={styles.lastTurnReport}>
              <h4 className={styles.boldText}>Estado del turno actual: Turno #{lastTurnReport.id}</h4>
              <p>Responsable: {lastTurnReport.employee ? lastTurnReport.employee.name : "Desconocido"}</p>
              <p>Hora de Inicio: {formatDate(lastTurnReport.turn_time)}</p>
              <p>Efectivo Inicial: {formatCurrency(lastTurnReport.turn_amount)}</p>
              <p>Total Entradas: {formatCurrency(lastTurnReport.total_entradas)}</p>
              <p>Total Salidas: {formatCurrency(lastTurnReport.total_salidas)}</p>
              <p className={styles.cashText}>Efectivo en Caja: {formatCurrency(lastTurnReport.saldo)}</p>
              {lastTurnReport.turn_description && (
                <p>Comentarios: {lastTurnReport.turn_description}</p>
              )}
              <button
                type="button"
                className={styles.previewButton}
                onClick={() => setShowMovements(true)}
              >
                Consulta de movimientos
              </button>
              <h3 className={styles.modalHeader} style={{ fontWeight: 'bold', marginTop: '8px' }}>Crear nuevo Turno de Caja</h3>
            </div>
          )}
          {!lastTurnReport && <p>No hay turnos anteriores.</p>}
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <select
                id="responsible"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                required
                className={styles.input}
              >
                <option value="">Seleccione un responsable</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="turnAmount">Importe inicial</label>
              <input
                type="number"
                id="turnAmount"
                value={turnAmount}
                onChange={(e) => setTurnAmount(e.target.value)}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="turnDescription">Comentarios</label>
              <textarea
                id="turnDescription"
                value={turnDescription}
                onChange={(e) => setTurnDescription(e.target.value)}
                className={styles.textarea}
              ></textarea>
            </div>
            <div className={styles.buttonContainer}>
              <button type="submit" className={`${styles.button} ${styles.saveButton}`}>
                Guardar nuevo turno
              </button>
            </div>
          </form>
          {error && <p className={styles.error}>{error}</p>}
          {showMovements && <Movements onClose={() => setShowMovements(false)} />}
        </div>
      </div>
    </div>
  );
};

export default TurnCashModal;
