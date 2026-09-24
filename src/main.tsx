import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

// Carga de estilos globales
const stylesUrl = new URL('./index.css', import.meta.url).href;
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = stylesUrl;
document.head.appendChild(link);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);