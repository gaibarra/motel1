import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import axios from '../config/axiosConfig'; // Asegúrate de que esta ruta sea correcta
import { AuthContext } from '../context/AuthContext';
import RoomButton from '../components/RoomButton';
import RoomStatusModal from '../components/RoomStatusModal';
import CashMovementModal from '../components/CashMovementModal';
import TurnCashModal from '../components/TurnCashModal';
import AdminModal from '../components/AdminModal';

const buttonStyle = {
  backgroundColor: "#083c6b",
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
  fontWeight: "bold",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const statusColors = {
  "OC": "red",
  "CL": "grey",
  "MT": "orange",
  "AV": "green",
  "LI": "#87CEEB",
};

const IndexPage = () => {
  const router = useRouter();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTurnCashModal, setShowTurnCashModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [turnCashId, setTurnCashId] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchRooms();
    fetchCurrentTurn();
  }, [forceUpdate, isAuthenticated]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get("rooms/");
      setRooms(response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error("No se encontraron habitaciones.");
      } else {
        console.error("Error fetching rooms:", error);
      }
    }
  };

  const fetchCurrentTurn = async () => {
    try {
      const response = await axios.get("turncash/current/");
      const turnData = response.data;
      console.log("API response:", turnData);
      setTurnCashId(turnData.id);
      fetchEmployee(turnData.employee);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error("No se encontró un turno activo.");
      } else {
        console.error("Error fetching current turn", error);
      }
    }
  };

  const fetchEmployee = async (employeeId) => {
    try {
      const response = await axios.get(`employees/${employeeId}/`);
      setEmployee(response.data);
    } catch (error) {
      console.error("Error fetching employee", error);
    }
  };

  const fetchOccupationTime = async (roomId) => {
    try {
      const response = await axios.get(`rooms/${roomId}/occupation_time/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching occupation time for room ${roomId}:`, error);
    }
  };

  const handleStatusChange = async () => {
    await fetchRooms();
  };

  const handleCloseModal = async (updated) => {
    setSelectedRoom(null);
    if (updated) {
      await handleStatusChange();
      await fetchCurrentTurn();
    }
  };

  const handleTurnCashModalClose = async (updated) => {
    setShowTurnCashModal(false);
    if (updated) {
      setForceUpdate((prev) => !prev);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusCounts = () => {
    const counts = { "OC": 0, "CL": 0, "MT": 0, "AV": 0, "LI": 0 };
    rooms.forEach(room => {
      counts[room.status] = (counts[room.status] || 0) + 1;
    });
    return counts;
  };

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    if (room.status === "OC") {
      await fetchOccupationTime(room.id);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const statusCounts = getStatusCounts();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        padding: "20px",
        backgroundColor: "#f4f4f9",
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: "10px",
          right: "20px",
          ...buttonStyle,
          backgroundColor: "#d9534f",
        }}
      >
        Logout
      </button>
      <button
        onClick={() => setShowAdminModal(true)}
        style={{
          position: "absolute",
          top: "10px",
          left: "20px",
          ...buttonStyle,
        }}
      >
        Administración
      </button>
      <h1 style={{ 
        marginBottom: "20px", 
        fontSize: "32px", 
        fontWeight: "bold", 
        color: "#083c6b", 
        textAlign: "center" 
      }}>Motel 1</h1>
      <div style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "bold", color: "#333" }}>
        Responsable: {employee ? `${employee.name} (Turno #${turnCashId})` : "Cargando..."}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setShowTurnCashModal(true)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
          }}
        >
          Crear nuevo Turno de Caja
        </button>
        <button
          onClick={() => setShowCashMovementModal(true)}
          style={buttonStyle}
          disabled={!turnCashId}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
          }}
        >
          Registrar Movimiento de Caja
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "10px",
          width: "100%",
        }}
      >
        {rooms
          .sort((a, b) => a.id - b.id)
          .map((room) => (
            <div key={room.id}>
              <RoomButton 
                room={room} 
                onClick={() => handleRoomClick(room)} 
              />
            </div>
          ))}
      </div>
      {selectedRoom && (
        <RoomStatusModal
          room={selectedRoom}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
      )}
      {showTurnCashModal && (
        <TurnCashModal onClose={handleTurnCashModalClose} turnCashId={turnCashId} />
      )}
      {showCashMovementModal && (
        <CashMovementModal
          turnCashId={turnCashId}
          onClose={() => setShowCashMovementModal(false)}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
        {Object.keys(statusCounts).map(status => (
          <div 
            key={status} 
            style={{ 
              backgroundColor: statusColors[status], 
              padding: '20px', 
              borderRadius: '5px', 
              color: 'white', 
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: '16px',
            }}
          >
            {statusCounts[status]}
          </div>
        ))}
      </div>
      {showAdminModal && (
        <AdminModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
};

export default IndexPage;