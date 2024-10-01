import React, { useState } from 'react';
import axios from 'axios';

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

const EditPaymentModal = ({ payment, onClose, onSave }) => {
  const [amount, setAmount] = useState(payment.payment_amount);

  const handleSave = async () => {
    try {
      await axios.put(`/api/payments/${payment.id}/`, {
        ...payment,
        payment_amount: amount,
      });
      onSave(payment.id, amount);
    } catch (error) {
      console.error('Error updating payment:', error);
    }
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
        <h2>Editar Importe</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ marginBottom: '10px', padding: '5px', width: '100%' }}
        />
        <button onClick={handleSave} style={buttonStyle}>
          Guardar
        </button>
        <button onClick={onClose} style={{ ...buttonStyle, backgroundColor: '#d9534f' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default EditPaymentModal;
