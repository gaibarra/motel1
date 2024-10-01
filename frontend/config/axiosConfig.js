import axios from 'axios';

// Crear la instancia de Axios con configuración predeterminada
const axiosInstance = axios.create({
  baseURL: 'https://motel1.online/api/',
  timeout: 30000, // Timeout de 30 segundos
});

// Reintento automático en caso de error de red
axiosInstance.interceptors.response.use(
  response => response, // Si la respuesta es exitosa, se devuelve
  async error => {
    const config = error.config;
    
    // Solo reintentar si es un error de red o si la solicitud ha caducado
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      // Establece un número máximo de reintentos
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < 3) { // Reintenta un máximo de 3 veces
        config.__retryCount += 1;
        
        // Esperar un tiempo antes de volver a intentar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vuelve a intentar la solicitud
        return axiosInstance(config);
      }
    }

    // Si la solicitud falla incluso después de los reintentos, propaga el error
    return Promise.reject(error);
  }
);

export default axiosInstance;
