import React from "react";

const TurnButton = ({ label, onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "#083c6b",
        padding: "20px",
        borderRadius: "12px",
        border: "none",
        margin: "10px",
        fontSize: "18px",
        fontWeight: "bold",
        color: "white",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto"
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = "scale(1.05)";
        e.target.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "scale(1)";
        e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
      }}
      disabled={disabled}
    >
      <div>{label}</div>
    </button>
  );
};

export default TurnButton;
