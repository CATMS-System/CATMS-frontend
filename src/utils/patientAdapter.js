// converts a backend patient into the shape the other panels still read

import { formatPatientId, formatPatientName, formatAddress } from './patientFormat';

export function adaptPatientForPanels(patient) {
    const policy = (patient.active_policies || [])[0];
    const contacts = patient.emergency_contacts || [];

    return {
        id: formatPatientId(patient.patient_id),
        name: formatPatientName(patient.first_name, patient.last_name),
        dob: patient.date_of_birth || '',
        gender: patient.gender || '',
        nic: patient.nic,
        contact: patient.contact_number || '',
        address: formatAddress(patient.street_address, patient.city, patient.state_province, patient.postal_code),
        insurance: policy
            ? { provider: policy.provider_name, policyNumber: policy.policy_number, expDate: policy.end_date }
            : { provider: 'None / Cash', policyNumber: '', expDate: '' },
        emergencyContacts: contacts.map(c => ({
            name: formatPatientName(c.first_name, c.last_name),
            relation: c.relationship_to_patient,
            phone: c.contact_number
        }))
    };
}