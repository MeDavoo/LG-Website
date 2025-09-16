import { createContext, useContext, useState, ReactNode } from 'react';
import { AdminPasswordModal } from '../components/AdminPasswordModal';
import { ADMIN_PASSWORD } from '../config/admin';

interface AdminAuthContextType {
  isAdmin: boolean;
  requireAdmin: (action: () => void) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });
  
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  function authenticate(password: string) {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("isAdmin", "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem("isAdmin");
    setIsAdmin(false);
  }

  function requireAdmin(action: () => void) {
    if (isAdmin) {
      action();
    } else {
      setPendingAction(() => action);
      setShowModal(true);
    }
  }

  function handlePasswordSubmit(password: string) {
    if (authenticate(password)) {
      setShowModal(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    } else {
      return false;
    }
  }

  function handleCancel() {
    setShowModal(false);
    setPendingAction(null);
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, requireAdmin, logout }}>
      {children}
      <AdminPasswordModal
        isOpen={showModal}
        onSubmit={handlePasswordSubmit}
        onCancel={handleCancel}
      />
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}