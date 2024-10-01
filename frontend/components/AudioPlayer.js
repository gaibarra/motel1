// components/AudioPlayer.js
import React from 'react';

const AudioPlayer = ({ src }) => {
  return (
    <audio controls>
      <source src={src} type="audio/mpeg" />
      Tu navegador no soporta el elemento de audio.
    </audio>
  );
};

export default AudioPlayer;
