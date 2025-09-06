// Hook Wrapper für AuthContext - für bessere Kompatibilität
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export const useAuth = () => useContext(AuthContext);