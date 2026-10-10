// formatting and validation helpers for patient records

// format numeric patient id to display code like PAT-0001
export function formatPatientId(patientId) {
  if (!patientId) return '';
  return `PAT-${String(patientId).padStart(4, '0')}`;
}

// format full name from first and last name
export function formatPatientName(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ').trim();
}

// join address components into a single readable line
export function formatAddress(street, city, state, postal) {
  const parts = [street, city, state, postal].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not recorded';
}

// check sri lankan nic format
export function isValidNic(nic) {
  if (!nic) return false;
  const clean = nic.trim().toUpperCase();
  return /^(\d{9}[VX]|\d{12})$/.test(clean);
}

// check 5 digit postal code
export function isValidPostalCode(code) {
  if (!code) return false;
  return /^\d{5}$/.test(code.trim());
}

// check phone format with 7 to 20 digits
export function isValidPhone(phone) {
  if (!phone) return false;
  return /^\+?\d[\d\s-]{6,19}$/.test(phone.trim());
}

// check basic email format
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// check date of birth is not in future
export function isValidDob(dob) {
  if (!dob) return false;
  const birthDate = new Date(dob);
  const today = new Date();
  if (birthDate > today) return false;
  const minYear = today.getFullYear() - 120;
  if (birthDate.getFullYear() < minYear) return false;
  return true;
}

// check policy date year is in the range the backend accepts
export function isValidPolicyYear(date) {
  if (!date) return false;
  const year = Number(date.slice(0, 4));
  return year >= 2000 && year <= new Date().getFullYear() + 50;
}

// check coverage is 0 to 100 with at most 2 decimals
export function isValidCoverage(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) return false;
  return Number(value) <= 100;
}

// adapt api patient row for other panels expecting fake patient shape
export function adaptPatientForPanels(patient) {
  if (!patient) return null;
  const id = formatPatientId(patient.patient_id);
  const name = formatPatientName(patient.first_name, patient.last_name);
  const address = formatAddress(
    patient.street_address,
    patient.city,
    patient.state_province,
    patient.postal_code
  );

  return {
    id,
    patient_id: patient.patient_id,
    name,
    first_name: patient.first_name,
    last_name: patient.last_name,
    dob: patient.date_of_birth,
    date_of_birth: patient.date_of_birth,
    nic: patient.nic,
    contact: patient.contact_number,
    contact_number: patient.contact_number,
    address,
    branch: 'Colombo Main',
    insurance: patient.active_policies && patient.active_policies.length > 0 ? {
      provider: patient.active_policies[0].provider_name,
      policyNumber: patient.active_policies[0].policy_number,
      expDate: patient.active_policies[0].end_date
    } : { provider: 'None', policyNumber: 'N/A', expDate: 'N/A' },
    emergencyContacts: (patient.emergency_contacts || []).map(c => ({
      name: formatPatientName(c.first_name, c.last_name),
      relation: c.relationship_to_patient,
      phone: c.contact_number
    }))
  };
}

export const SRI_LANKA_PROVINCES = [
  'Western Province',
  'Central Province',
  'Southern Province',
  'Northern Province',
  'Eastern Province',
  'North Western Province',
  'North Central Province',
  'Uva Province',
  'Sabaragamuwa Province'
];
