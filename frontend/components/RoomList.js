import React, { useState, useEffect } from "react";
import axios from "axios";
import RoomStatusModal from "./RoomStatusModal";
import TurnCashModal from "./TurnCashModal"; // Asegúrate de que esta ruta sea correcta

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTurnCashModal, setShowTurnCashModal] = useState(false); // Nuevo estado para controlar el modal de TurnCash

  useEffect(() => {
    axios.get("https://motel1.click/api/rooms/").then((response) => {
      setRooms(response.data);
    });
  }, []);

  const handleStatusChange = (roomId, newStatus) => {
    setRooms(
      rooms.map((room) =>
        room.id === roomId ? { ...room, status: newStatus } : room
      )
    );
  };

  return (
    <div>
      <button
        onClick={() => setShowTurnCashModal(true)}
        style={{
          backgroundColor: "#4CAF50",
          color: "blue",
          padding: "5px 10px", // Modificado para reducir el espaciado interno
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "14px", // Modificado para reducir el tamaño de fuente
          fontWeight: "bold",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          transition: "0.3s",
        }}
      >
        Crea nuevo Turno de Caja
      </button>{" "}
      {/* Nuevo botón para abrir el modal de TurnCash */}
      {rooms.map((room) => (
        <div key={room.id}>
          <button onClick={() => setSelectedRoom(room)}>
            Update Room {room.number} Status
          </button>
        </div>
      ))}
      {selectedRoom && (
        <RoomStatusModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onStatusChange={handleStatusChange}
        />
      )}
      {showTurnCashModal && (
        <TurnCashModal
          onClose={() => setShowTurnCashModal(false)}
        />
      )}
    </div>
  );
};

export default RoomList;
