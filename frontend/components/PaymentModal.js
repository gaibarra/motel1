import React, { useEffect, useState } from "react";
import axios from "axios";
import EditPaymentModal from "./EditPaymentModal";

const modalStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  textAlign: "center",
  width: "80%",
  maxHeight: "80%",
  overflowY: "auto",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
};

const buttonStyle = {
  backgroundColor: "#083c6b",
  padding: "10px",
  borderRadius: "8px",
  border: "none",
  color: "white",
  cursor: "pointer",
  marginTop: "10px",
  marginRight: "5px",
  fontSize: "16px",
};

const PaymentModal = ({ selectedDate, onClose }) => {
  const [payments, setPayments] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalMonthAmount, setTotalMonthAmount] = useState(0);
  const [editingPayment, setEditingPayment] = useState(null);

  useEffect(() => {
    if (selectedDate) {
      console.log("Selected Date: ", selectedDate);
      fetchPayments(selectedDate);
      fetchMonthlyPayments(selectedDate);
    }
  }, [selectedDate]);

  const fetchPayments = async (date) => {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      console.log("Start Date: ", startDate.toISOString());
      console.log("End Date: ", endDate.toISOString());

      const response = await axios.get(`/api/payments`);
      const filteredPayments = response.data.filter((payment) => {
        const paymentDate = new Date(payment.payment_time);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      console.log("Filtered Payments: ", filteredPayments);

      const paymentsWithRoomNumbers = await Promise.all(
        filteredPayments.map(async (payment) => {
          const roomResponse = await axios.get(`/api/rooms/${payment.room}/`);
          return { ...payment, room_number: roomResponse.data.number };
        })
      );

      setPayments(paymentsWithRoomNumbers);
      calculateTotal(paymentsWithRoomNumbers);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchMonthlyPayments = async (date) => {
    try {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      console.log("Monthly Start Date: ", startDate.toISOString());
      console.log("Monthly End Date: ", endDate.toISOString());

      const response = await axios.get(`/api/payments`);
      const filteredMonthlyPayments = response.data.filter((payment) => {
        const paymentDate = new Date(payment.payment_time);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      console.log("Filtered Monthly Payments: ", filteredMonthlyPayments);
      calculateTotalMonth(filteredMonthlyPayments);
    } catch (error) {
      console.error("Error fetching monthly payments:", error);
    }
  };

  const calculateTotal = (payments) => {
    const total = payments.reduce(
      (sum, payment) => sum + parseFloat(payment.payment_amount),
      0
    );
    setTotalAmount(total);
  };

  const calculateTotalMonth = (payments) => {
    const total = payments.reduce(
      (sum, payment) => sum + parseFloat(payment.payment_amount),
      0
    );
    setTotalMonthAmount(total);
  };

  const handleDelete = async (paymentId) => {
    try {
      await axios.delete(`/api/payments/${paymentId}`);
      fetchPayments(selectedDate);
      fetchMonthlyPayments(selectedDate);
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
  };

  const handleSaveEdit = (paymentId, newAmount) => {
    setPayments((prevPayments) =>
      prevPayments.map((payment) =>
        payment.id === paymentId
          ? { ...payment, payment_amount: newAmount }
          : payment
      )
    );
    const updatedPayments = payments.map((payment) =>
      payment.id === paymentId
        ? { ...payment, payment_amount: newAmount }
        : payment
    );
    calculateTotal(updatedPayments);
    fetchMonthlyPayments(selectedDate); // Recalcular total del mes después de editar
    setEditingPayment(null);
  };

  const handlePrintReport = () => {
    generateExecutiveReport();
  };

  const formatDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(date).toLocaleDateString("es-MX", options);
  };

  const generateExecutiveReport = () => {
    const reportContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Motel 1</h1>
        <h2>Movimientos del ${formatDate(selectedDate)}</h2>
        <table>
          <thead>
            <tr>
              
              <th>Importe</th>
              <th>Habitación</th>
              <th>Vehículo</th>
          
            </tr>
          </thead>
          <tbody>
            ${payments
              .map(
                (payment) => `
              <tr>
              
                <td>${parseFloat(payment.payment_amount).toLocaleString(
                  "es-MX",
                  { style: "currency", currency: "MXN" }
                )}</td>
                <td>${payment.room_number}</td>
                <td>${payment.vehicle_info}</td>
              
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p class="total">Total del día: ${totalAmount.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}</p>
       
        <p class="total">Registros del día: ${payments.length}</p>
      </body>
      </html>
    `;

    const newWindow = window.open();
    newWindow.document.write(reportContent);
    newWindow.document.close();
    newWindow.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={modalStyle}>
        <h2>Movimientos del {formatDate(selectedDate)}</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
            fontWeight: "bold",
          }}
        >
          <span style={{ marginRight: "20px" }}>
            Registros: {payments.length}
          </span>
          <span>
            Total del día:{" "}
            {totalAmount.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </span>
          <span style={{ marginLeft: "20px" }}>
            Total del mes:{" "}
            {totalMonthAmount.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Hora
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Importe
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Habitación
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Vehículo
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Duración
              </th>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  backgroundColor: "#f2f2f2",
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {new Date(payment.payment_time).toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {parseFloat(payment.payment_amount).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {payment.room_number}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {payment.vehicle_info}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {payment.rent_duration} horas
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  <button
                    onClick={() => handleEdit(payment)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#5bc0de",
                      padding: "5px 10px",
                      margin: "0 5px",
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#d9534f",
                      padding: "5px 10px",
                    }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <button
            onClick={handlePrintReport}
            style={{ ...buttonStyle, marginRight: "10px" }}
          >
            Imprimir Reporte
          </button>
          <button
            onClick={onClose}
            style={{ ...buttonStyle, backgroundColor: "#d9534f" }}
          >
            Cerrar
          </button>
        </div>
      </div>
      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default PaymentModal;
