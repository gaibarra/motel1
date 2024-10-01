import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PaymentModal from './PaymentModal';

const modalStyle = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '10px',
  textAlign: 'center',
  width: '300px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
};

const buttonStyle = {
  backgroundColor: "#083c6b",
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  color: "white",
  cursor: "pointer",
  marginTop: "10px",
  width: "100%",
  fontSize: "16px",
};

const AdminModal = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePasswordSubmit = () => {
    if (password === 'bacanora2024') {
      setAuthenticated(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={modalStyle}>
        {!authenticated ? (
          <div>
            <h2>Ingrese Contraseña</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginBottom: '10px', padding: '5px', width: '100%' }}
            />
            <button onClick={handlePasswordSubmit} style={buttonStyle}>
              Enviar
            </button>
          </div>
        ) : (
          <div>
            <h2>Seleccione una Fecha</h2>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              inline
            />
          </div>
        )}
        <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: '#d9534f' }}>
          Cerrar
        </button>
      </div>
      {showPaymentModal && (
        <PaymentModal selectedDate={selectedDate} onClose={handleClosePaymentModal} />
      )}
    </div>
  );
};

export default AdminModal;
