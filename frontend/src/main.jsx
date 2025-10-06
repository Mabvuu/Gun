// src/main.jsx
import axios from 'axios';

// must set baseURL before importing App/any component that uses axios
axios.defaults.baseURL = 'http://localhost:4000';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
