import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { getFrontendRoleCode } from '../utils/authRole.js';

export const DEMO_LOGINS = [
  { role: 'Admin', roleCode: 'ROLE_ADMIN', email: 'admin_alana', password: 'Password123!', name: 'Alana Smith [Admin]', branch: 'All Branches', branch_id: 1, Branch_ID: 1 },
  { role: 'Branch Manager', roleCode: 'ROLE_BRANCH_MANAGER', email: 'mgr_vance', password: 'Password123!', name: 'Marcus Vance [Manager]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 4, Staff_ID: 4 },
  { role: 'Receptionist', roleCode: 'ROLE_RECEPTIONIST', email: 'recept_shenaya', password: 'Password123!', name: 'Shenaya Perera [Recept]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 9, Staff_ID: 9 },
  { role: 'Doctor', roleCode: 'ROLE_DOCTOR', email: 'dr_bennett', password: 'Password123!', name: 'Dr. Alexander Bennett [Doc]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, id: 'STF-001', doctor_id: 1, doctorId: 1, Doctor_ID: 1, staff_id: 1, Staff_ID: 1 },
  { role: 'Billing Staff', roleCode: 'ROLE_BILLING_STAFF', email: 'billing_patel', password: 'Password123!', name: 'Sophia Patel [Colombo Billing]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, staff_id: 5, Staff_ID: 5 },
  { role: 'Billing Staff', roleCode: 'ROLE_BILLING_STAFF', email: 'billing_kandy', password: 'Password123!', name: 'Kamal Perera [Kandy Billing]', branch: 'Kandy', branch_id: 2, Branch_ID: 2, staff_id: 11, Staff_ID: 11 },
  { role: 'Billing Staff', roleCode: 'ROLE_BILLING_STAFF', email: 'billing_galle', password: 'Password123!', name: 'Nirosha Silva [Galle Billing]', branch: 'Galle', branch_id: 3, Branch_ID: 3, staff_id: 12, Staff_ID: 12 },
  { role: 'Patient', roleCode: 'ROLE_PATIENT', email: 'pat_johndoe', password: 'Password123!', name: 'John Doe [Patient]', branch: 'Colombo Main', branch_id: 1, Branch_ID: 1, patientId: 'PAT-0001', patient_id: 1, Patient_ID: 1 }
];

export function normalizeUser(me, fallbackEmail = '') {
  const roleCode = getFrontendRoleCode(me.System_Role);
  const isDoctor = roleCode === 'ROLE_DOCTOR';
  const doctorId = isDoctor ? (me.Doctor_ID || me.doctor_id || me.Staff_ID || me.staff_id || 1) : undefined;
  const resolvedPatientId = roleCode === 'ROLE_PATIENT' ? (me.Patient_ID || me.patient_id || me.patientId || 1) : undefined;
  const patientFormattedId = resolvedPatientId ? `PAT-${String(resolvedPatientId).padStart(4, '0')}` : undefined;
  const displayName = me.First_Name && me.Last_Name ? `${me.First_Name} ${me.Last_Name}` : (me.Username || me.name);

  return {
    Account_ID: me.Account_ID,
    name: displayName,
    Username: me.Username || me.name,
    First_Name: me.First_Name,
    Last_Name: me.Last_Name,
    email: me.Email || fallbackEmail,
    role: me.System_Role,
    roleCode,
    branch: me.branch || 'Colombo Main',
    branch_id: me.Branch_ID || me.branch_id || 1,
    Branch_ID: me.Branch_ID || me.branch_id || 1,
    id: isDoctor ? (me.id || `STF-${String(me.Staff_ID || me.Doctor_ID || 1).padStart(3, '0')}`) : (me.id || undefined),
    doctor_id: doctorId,
    doctorId: doctorId,
    Doctor_ID: doctorId,
    staff_id: me.Staff_ID || me.staff_id || 1,
    Staff_ID: me.Staff_ID || me.staff_id || 1,
    patientId: patientFormattedId,
    patient_id: resolvedPatientId,
    Patient_ID: resolvedPatientId
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
