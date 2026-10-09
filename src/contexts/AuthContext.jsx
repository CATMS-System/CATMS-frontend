import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { getFrontendRoleCode } from '../utils/authRole.js';

export const DEMO_LOGINS = [
  { role: 'Admin', roleCode: 'ROLE_ADMIN', email: 'admin_alana', password: 'admin123', name: 'Alana Smith [Admin]', branch: 'All Branches', branch_id: 1, Branch_ID: 1 },
  { role: 'Branch Manager', roleCode: 'ROLE_BRANCH_MANAGER', email: 'mgr_vance', password: 'manager123', name: 'Marcus Vance [Manager]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 4, Staff_ID: 4 },
  { role: 'Receptionist', roleCode: 'ROLE_RECEPTIONIST', email: 'recept_shenaya', password: 'recept123', name: 'Shenaya Perera [Recept]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 9, Staff_ID: 9 },
  { role: 'Doctor', roleCode: 'ROLE_DOCTOR', email: 'dr_bennett', password: 'doc123', name: 'Dr. Alexander Bennett [Doc]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, id: 'STF-001', doctor_id: 1, doctorId: 1, Doctor_ID: 1, staff_id: 1, Staff_ID: 1 },
  { role: 'Billing Staff', roleCode: 'ROLE_BILLING_STAFF', email: 'billing_patel', password: 'bill123', name: 'Dilhani Fernando [Billing]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 5, Staff_ID: 5 },
  { role: 'Patient', roleCode: 'ROLE_PATIENT', email: 'pat_johndoe', password: 'pat123', name: 'John Doe [Patient]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, patientId: 'PAT-0001', patient_id: 1, Patient_ID: 1 }
];

export function normalizeUser(me, fallbackEmail = '') {
  const roleCode = getFrontendRoleCode(me.System_Role);
  const isDoctor = roleCode === 'ROLE_DOCTOR';
  const doctorId = isDoctor ? (me.Doctor_ID || me.Staff_ID || me.doctor_id || 1) : undefined;
  return {
    Account_ID: me.Account_ID,
    name: me.Username || me.name,
    email: me.Email || fallbackEmail,
    role: me.System_Role,
    roleCode,
    branch: me.branch || 'Colombo Main',
    branch_id: me.branch_id || me.Branch_ID || 1,
    Branch_ID: me.Branch_ID || me.branch_id || 1,
    id: isDoctor ? (me.id || 'STF-001') : (me.id || undefined),
    doctor_id: doctorId,
    doctorId: doctorId,
    Doctor_ID: doctorId,
    staff_id: me.Staff_ID || me.staff_id || 1,
    Staff_ID: me.Staff_ID || me.staff_id || 1,
    patientId: roleCode === 'ROLE_PATIENT' ? (me.Patient_ID || me.patientId || 'PAT-0001') : undefined,
    patient_id: roleCode === 'ROLE_PATIENT' ? (me.Patient_ID || me.patient_id || 1) : undefined
  };
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('catms_user') : null;
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.name && parsed.roleCode) {
        return parsed;
      }
    } catch {}
    return null;
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsHydrated(true);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = response.data;
      if (access_token) {
        localStorage.setItem('token', access_token);

        let finalUser = null;
        try {
          const meRes = await api.get('/auth/me');
          if (meRes.data) {
            finalUser = normalizeUser(meRes.data, username);
          }
        } catch (meErr) {
          console.warn("Could not fetch /auth/me profile, using fallback:", meErr);
        }

        if (!finalUser) {
          const demo = DEMO_LOGINS.find(u => u.email.toLowerCase() === username.toLowerCase());
          finalUser = demo || {
            role: 'Staff',
            roleCode: 'ROLE_RECEPTIONIST',
            email: username,
            name: username,
            branch: 'Colombo Main',
            branch_id: 1,
            Branch_ID: 1
          };
        }

        localStorage.setItem('catms_user', JSON.stringify(finalUser));
        setCurrentUser(finalUser);
        return { success: true, user: finalUser };
      }
      throw new Error('No access token returned');
    } catch (error) {
      // Demo fallback if backend login fails
      const demoUser = DEMO_LOGINS.find(
        u => u.email.toLowerCase() === username.toLowerCase() && u.password === password
      );
      if (demoUser) {
        localStorage.setItem('catms_user', JSON.stringify(demoUser));
        setCurrentUser(demoUser);
        return { success: true, user: demoUser, isDemo: true };
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('catms_user');
    setCurrentUser(null);
  };

  const quickSwitchRole = (roleCode) => {
    const targetUser = DEMO_LOGINS.find(u => u.roleCode === roleCode);
    if (targetUser) {
      localStorage.setItem('catms_user', JSON.stringify(targetUser));
      setCurrentUser(targetUser);
      return targetUser;
    }
    return null;
  };

  const value = {
    currentUser,
    user: currentUser,
    isAuthenticated: Boolean(currentUser),
    isHydrated,
    loading,
    login,
    logout,
    quickSwitchRole,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('catms_user') : null;
    let fallbackUser = null;
    try {
      fallbackUser = saved ? JSON.parse(saved) : null;
    } catch {}
    return {
      currentUser: fallbackUser,
      user: fallbackUser,
      isAuthenticated: Boolean(fallbackUser),
      isHydrated: true,
      loading: false,
      login: async () => {},
      logout: () => {},
      quickSwitchRole: () => null,
      setCurrentUser: () => {}
    };
  }
  return context;
};

export default AuthContext;
