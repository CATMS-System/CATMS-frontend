// Backend role values, retaining the existing frontend Nurse mapping and mapping Patient.
export function getFrontendRoleCode(systemRole) {
  const roles = {
    Admin: 'ROLE_ADMIN',
    Doctor: 'ROLE_DOCTOR',
    Receptionist: 'ROLE_RECEPTIONIST',
    Nurse: 'ROLE_NURSE',
    Billing_Staff: 'ROLE_BILLING_STAFF',
    Branch_Manager: 'ROLE_BRANCH_MANAGER',
    Patient: 'ROLE_PATIENT'
  };
  return Object.hasOwn(roles, systemRole) ? roles[systemRole] : 'ROLE_RECEPTIONIST';
}
