import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProductDraftProvider } from './context/ProductDraftContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <ProductDraftProvider>
          <App />
        </ProductDraftProvider>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);

