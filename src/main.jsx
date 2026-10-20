import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DialogProvider } from './components/common/dialog/DialogProvider.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <DialogProvider>
      <App />
    </DialogProvider>
  </AuthProvider>,
);
