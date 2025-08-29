import axios from 'axios';

export const BASE_URL = 'https://trackoroute.onrender.com/api';
// export const BASE_URL = 'exp://ov-ki9q-arpatil-dev-8081.exp.direct:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
