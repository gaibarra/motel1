// components/RoomContainer.js
import React from "react";
import RoomButton from "./RoomButton";

const RoomContainer = ({ rooms, onRoomClick }) => {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
      {rooms.map((room) => (
        <RoomButton key={room.number} room={room} onClick={() => onRoomClick(room)} />
      ))}
    </div>
  );
};

export default RoomContainer;
