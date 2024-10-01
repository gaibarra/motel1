import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import axios from '../utils/axios'; 
import Swal from 'sweetalert2';
import styles from "./RoomStatusModal.module.css";

const RoomStatusModal = ({ room, onClose, onStatusChange }) => {
  const { number, status: initialStatus, rent_price } = room;

  const [status, setStatus] = useState(initialStatus || "AV");
  const [paymentAmount, setPaymentAmount] = useState(initialStatus === "OC" ? rent_price : "");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [rentDuration, setRentDuration] = useState(4);
  const [totalHours, setTotalHours] = useState(0);
  const [isRenewal, setIsRenewal] = useState(false);
  const [cleaningStartTime, setCleaningStartTime] = useState(room.cleaning_start_time || null);
  const [error, setError] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    if (status === "OC" && initialStatus === "OC") {
      fetchLastPaymentInfo();
      setIsRenewal(true);
    } else if (status === "OC") {
      setPaymentAmount(rent_price);
      setIsRenewal(false);
    } else if (status === "CL") {
      const newCleaningStartTime = new Date().toISOString();
      setCleaningStartTime(newCleaningStartTime); // Actualizamos el tiempo de limpieza al cambiar a "CL"
    } else {
      resetForm();
    }
    setError(null);
    setMissingFields([]);
  }, [status, initialStatus]);

  const fetchLastPaymentInfo = async () => {
    try {
      const response = await axios.get(`/rooms/${number}/last_payment_for_room/`);
      if (response.data) {
        setPaymentAmount(response.data.payment_amount || rent_price);
        setVehicleInfo(response.data.vehicle_info || "");
        setTotalHours(room.total_hours || 0);
      }
    } catch (error) {
      console.error("Error fetching last payment info:", error);
      setError("Error al obtener la información de pago.");
    }
  };

  const validateFields = () => {
    let fields = [];
    if (status === "OC") {
      if (!paymentAmount || paymentAmount <= 0) fields.push("paymentAmount");
      if (!vehicleInfo) fields.push("vehicleInfo");
      if (!rentDuration || rentDuration <= 0) fields.push("rentDuration");

      if (fields.length > 0) {
        setMissingFields(fields);
        setError("Por favor, complete todos los campos requeridos y asegúrese de que los valores sean válidos.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateFields()) return;

    try {
      const updatedTotalHours = parseInt(totalHours) + parseInt(rentDuration);

      // Actualizar el estado de la habitación
      await updateRoomStatus(updatedTotalHours);

      const response = await axios.get(`/rooms/${number}/occupation_time/`);
      const { occupation_time, expiry_time } = response.data;

      // Enviar los datos actualizados al componente padre
      onStatusChange({
        ...room,
        status,
        rent_price: paymentAmount,
        occupation_time,
        expiry_time,
        total_hours: updatedTotalHours,
        is_renewal: status === 'OC' && initialStatus === 'OC',
        cleaning_start_time: cleaningStartTime, // Pasar el tiempo de limpieza actual
      });

      Swal.fire({
        title: `<strong style="color: blue;">${number}</strong>`,
        html: `<strong>El estado del cuarto ha sido registrado.</strong>`,
        icon: "success",
        confirmButtonText: "Ok",
      });

      onClose(true);
    } catch (error) {
      console.error("Error updating room status:", error.response || error);
      Swal.fire({
        title: "Error",
        text: "Hubo un problema al actualizar el estado de la habitación. Por favor, intente de nuevo.",
        icon: "error",
        confirmButtonText: "Ok",
      });
    }
  };

  const updateRoomStatus = async (totalHours) => {
    const payload = {
        status,
        number,
        rent_price,
        payment_amount: paymentAmount,
        vehicle_info: vehicleInfo,
        rent_duration: rentDuration,
        total_hours: totalHours,
        is_renewal: isRenewal,
        cleaning_start_time: cleaningStartTime, // Incluir en el payload
    };

    try {
        await axios.put(`/rooms/${number}/`, payload);
    } catch (error) {
        console.error("Error updating room status:", error.response || error);
        throw error;
    }
  };

  const resetForm = () => {
      setPaymentAmount("");
      setVehicleInfo("");
      setRentDuration(4);
      setTotalHours(0);
      setIsRenewal(false);
      setCleaningStartTime(null); // Resetear tiempo de limpieza
  };

  const getFieldStyle = (field) => {
      return missingFields.includes(field) ? { borderColor: "red" } : {};
  };

  return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalBackdrop} onClick={() => onClose(false)}></div>
        <div className={styles.modalContent}>
          <button onClick={() => onClose(false)} className={styles.closeButton} aria-label="Cerrar">
            &times;
          </button>
          <div className={styles.modalBody}>
            <h3 className={styles.modalHeader}>
              Actualizar Estado del cuarto {number}
            </h3>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label htmlFor="status" className={styles.label}>
                Seleccionar nuevo estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  if (e.target.value === "OC" && initialStatus === "OC") {
                    fetchLastPaymentInfo();
                  }
                  setError(null);
                  setMissingFields([]);
                }}
                className={styles.select}
              >
                <option value="OC">Rentado</option>
                <option value="CL">Sucio</option>
                <option value="MT">Mantenimiento</option>
                <option value="AV">Preparado</option>
                <option value="LI">Limpio</option>
              </select>

              {status === "OC" && (
                <>
                  <label htmlFor="payment" className={styles.label}>
                    Importe pagado
                  </label>
                  <input
                    id="payment"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className={styles.input}
                    required
                    style={getFieldStyle("paymentAmount")}
                  />
                  <label htmlFor="vehicleInfo" className={styles.label}>
                    Información del Vehículo
                  </label>
                  <input
                    id="vehicleInfo"
                    type="text"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    className={styles.input}
                    required
                    readOnly={isRenewal}
                    style={{
                      ...getFieldStyle("vehicleInfo"),
                      backgroundColor: isRenewal ? '#e0e0e0' : 'white'
                    }}
                  />
                  <label htmlFor="rentDuration" className={styles.label}>
                    Duración de la renta (horas)
                  </label>
                  <input
                    id="rentDuration"
                    type="number"
                    value={rentDuration}
                    onChange={(e) => setRentDuration(e.target.value)}
                    className={styles.input}
                    required
                    style={getFieldStyle("rentDuration")}
                  />
                  <p className={styles.totalHours}>
                    Total de horas acumuladas: {totalHours} horas
                  </p>
                </>
              )}
              <button type="submit" className={styles.submitButton}>
                Guardar Estado
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </div>
    );
};

RoomStatusModal.propTypes = {
  room: PropTypes.shape({
    number: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    rent_price: PropTypes.number,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
};

export default RoomStatusModal;