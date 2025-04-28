import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FingerprintProvider } from './context/FingerprintContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FingerprintProvider>
      <App />
    </FingerprintProvider>
  </StrictMode>
);
