import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import styles from './RoomButton.module.css';
import Tooltip from '@material-ui/core/Tooltip';
import axios from '../utils/axios';

const RoomButton = ({ room, onClick }) => {
  const [occupationTime, setOccupationTime] = useState(null);
  const [expiryTime, setExpiryTime] = useState(null);
  const [cleaningStartTime, setCleaningStartTime] = useState(room.cleaning_start_time ? new Date(room.cleaning_start_time) : null);
  const [totalHours, setTotalHours] = useState(room.total_hours || 0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (room.status === "CL" && room.cleaning_start_time) {
      setCleaningStartTime(new Date(room.cleaning_start_time));
    } else {
      setCleaningStartTime(null);  // Aseguramos que se resetee si no hay limpieza en curso
    }

    const fetchRoomDetails = async () => {
      try {
        const response = await axios.get(`/rooms/${room.number}/occupation_time/`);
        const { occupation_time, expiry_time, cleaning_start_time } = response.data;

        if (occupation_time) {
          setOccupationTime(new Date(occupation_time));
        }
        if (expiry_time) {
          setExpiryTime(new Date(expiry_time));
        }
        if (cleaning_start_time && room.status === "CL") {
          setCleaningStartTime(new Date(cleaning_start_time));
        }
        setTotalHours(room.total_hours || 0);
      } catch (error) {
        console.error("Error fetching details for room", room.number, error);
        setError("Error al obtener los detalles de la habitación.");
      }
    };

    fetchRoomDetails();
  }, [room]);

  const getStatusColor = (status) => {
    switch (status) {
      case "OC":
        return "bg-red-500";
      case "CL":
        return "bg-gray-500";
      case "MT":
        return "bg-orange-500";
      case "AV":
        return "bg-green-500";
      case "LI":
        return "bg-blue-300";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case "OC":
        return "Rentado";
      case "CL":
        return "Sucio";
      case "MT":
        return "Mantenimiento";
      case "AV":
        return "Preparado";
      case "LI":
        return "Limpio";
      default:
        return "Desconocido";
    }
  };

  const formatTime = (time) => {
    if (!time || time === "Invalid Date") return "Hora no disponible";
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Tooltip title={`Horas acumuladas: ${totalHours} horas`} arrow>
      <button
        onClick={onClick}
        className={`${styles.button} ${getStatusColor(room.status)} ${room.status === "OC" && expiryTime && new Date() > expiryTime ? styles.shakingButton : ''}`}
        aria-label={`Room ${room.number} is ${getStatusDescription(room.status)}`}
      >
        <div className={styles.indicator}>{room.number}</div>
        <div>{getStatusDescription(room.status)}</div>

        {/* Mostrar el tiempo de ocupación y expiración si está rentado */}
        {room.status === "OC" && !error && (
          <>
            <div style={{ marginTop: "10px" }}>
              {formatTime(occupationTime)} - {formatTime(expiryTime)}
            </div>
            <span className={styles.badge}>{totalHours} horas</span>
          </>
        )}

        {/* Mostrar la hora de inicio de la limpieza si el estado es CL */}
        {room.status === "CL" && cleaningStartTime && (
          <div className={styles.cleaningTime}>
            <strong>Inicio de limpieza:</strong> {formatTime(cleaningStartTime)}
          </div>
        )}

        {room.is_renewal && room.status === "OC" && (
          <div className={styles.renewalNotice}>
            <em>Renta renovada</em>
          </div>
        )}

        {room.status === "AV" && (
          <div style={{ marginTop: "10px" }}>${room.rent_price}</div>
        )}

        {error && (
          <div style={{ marginTop: "10px", color: "white" }}>
            {error}
          </div>
        )}
      </button>
    </Tooltip>
  );
};

RoomButton.propTypes = {
  room: PropTypes.shape({
    number: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    rent_price: PropTypes.number,
    total_hours: PropTypes.number,
    cleaning_start_time: PropTypes.string,
    is_renewal: PropTypes.bool,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default RoomButton;