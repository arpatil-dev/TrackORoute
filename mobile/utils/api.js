import axios from 'axios';

/* Base URL for API requests */
// export const BASE_URL = 'http://192.168.1.6:5000/api';
export const BASE_URL = 'https://trackoroute.onrender.com/api';
/* export const BASE_URL = 'exp://ov-ki9q-arpatil-dev-8081.exp.direct:5000/api'; */

/* Axios instance with default config */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* Exporting the configured axios instance */
export default api;
