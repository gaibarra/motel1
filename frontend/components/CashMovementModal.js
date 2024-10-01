import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import styles from "./CashMovementModal.module.css";

const CashMovementModal = ({ turnCashId, onClose }) => {
  const [movementType, setMovementType] = useState("");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCurrentBalance = async () => {
      try {
        const response = await axios.get(
          `https://motel1.click/api/turncash/${turnCashId}/current_balance/`
        );
        console.log("Balance response:", response.data);
        setCurrentBalance(response.data.balance);
      } catch (error) {
        console.error("Error fetching current balance", error);
        setError("Error al obtener el saldo actual en caja.");
      }
    };

    fetchCurrentBalance();
  }, [turnCashId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!movementType || !amount || !concept) {
      setError("Por favor, complete todos los campos.");
      return;
    }

    if (movementType === "salida" && parseFloat(amount) > currentBalance) {
      Swal.fire({
        title: "Error",
        text: "El monto de salida excede el saldo en caja. No se puede registrar el movimiento.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      await axios.post("https://motel1.click/api/cashmovements/", {
        turn_cash: turnCashId,
        movement_type: movementType,
        amount: parseFloat(amount),
        concept,
      });
      Swal.fire({
        title: "Movimiento de caja registrado",
        text: "El movimiento de caja se ha registrado exitosamente.",
        icon: "success",
        confirmButtonText: "OK",
      });
      onClose(true);
    } catch (error) {
      console.error("Error registering cash movement", error);
      setError("Error al registrar el movimiento de caja.");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalBackdrop}
        onClick={() => onClose(false)}
      ></div>
      <div className={styles.modalContent}>
        <button
          onClick={() => onClose(false)}
          className={styles.closeButton}
          aria-label="Cerrar"
        >
          &times;
        </button>
        <div className={styles.modalBody}>
          <h3 className={styles.modalHeader}>Registrar Movimiento de Caja</h3>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="movementType">Tipo de Movimiento</label>
              <select
                id="movementType"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                required
              >
                <option value="">Seleccione un tipo</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="amount">Monto</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="concept">Concepto del Movimiento</label>
              <textarea
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
              ></textarea>
            </div>

            <div className={styles.buttonContainer}>
              <button type="submit" className={styles.submitButton}>
                Registrar Movimiento
              </button>
            </div>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CashMovementModal;
