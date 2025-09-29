import { StrictMode} from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { useUserStore } from './store/user.ts'
import './index.css'
import './style/layout.css'

// ✅ Initialize user store function
const initializeUserStore = () => {
  const initializeUser = useUserStore.getState().initializeUser;
  initializeUser();
};

// Initialize once
initializeUserStore();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)