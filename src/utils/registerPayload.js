// builds the register request body and reads errors that come back

// api field name (with its path) to the form field name
const FIELD_NAMES = {
    first_name: 'firstName',
    last_name: 'lastName',
    date_of_birth: 'dob',
    gender: 'gender',
    nic: 'nic',
    contact_number: 'contactNumber',
    email: 'email',
    street_address: 'streetAddress',
    city: 'city',
    state_province: 'stateProvince',
    postal_code: 'postalCode',
    'emergency_contact.first_name': 'emergencyFirstName',
    'emergency_contact.last_name': 'emergencyLastName',
    'emergency_contact.relationship_to_patient': 'emergencyRelation',
    'emergency_contact.contact_number': 'emergencyPhone',
    'emergency_contact.street_address': 'emergencyStreet',
    'insurance_policy.provider_id': 'providerId',
    'insurance_policy.policy_number': 'policyNumber',
    'insurance_policy.policy_type': 'policyType',
    'insurance_policy.start_date': 'startDate',
    'insurance_policy.end_date': 'endDate',
    'insurance_policy.default_coverage_percentage': 'coveragePercent'
};

export function buildRegisterBody(form) {
    const body = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        date_of_birth: form.dob,
        gender: form.gender,
        nic: form.nic.trim().toUpperCase(),
        contact_number: form.contactNumber.trim(),
        email: form.email.trim() || null,
        street_address: form.streetAddress.trim(),
        city: form.city.trim(),
        state_province: form.stateProvince.trim(),
        postal_code: form.postalCode.trim(),
        emergency_contact: {
            first_name: form.emergencyFirstName.trim(),
            last_name: form.emergencyLastName.trim(),
            relationship_to_patient: form.emergencyRelation.trim(),
            contact_number: form.emergencyPhone.trim(),
            street_address: form.emergencyStreet.trim() || null
        }
    };

    if (form.hasInsurance) {
        body.insurance_policy = {
            provider_id: Number(form.providerId),
            policy_number: form.policyNumber.trim(),
            policy_type: form.policyType,
            start_date: form.startDate,
            end_date: form.endDate,
            default_coverage_percentage: Number(form.coveragePercent)
        };
    }

    return body;
}

// returns messages for the form fields and a message for the top banner
export function readRegisterError(err) {
    const fieldErrors = {};
    let message = '';

    for (const key in err.fieldErrors) {
        if (FIELD_NAMES[key]) fieldErrors[FIELD_NAMES[key]] = err.fieldErrors[key];
    }

    if (err.status === 409 && err.message.includes('NIC')) {
        fieldErrors.nic = err.message;
    } else if (err.status === 409 && err.message.includes('policy number')) {
        fieldErrors.policyNumber = err.message;
    } else if (err.message.toLowerCase().includes('provider') || err.message.includes('referenced record')) {
        fieldErrors.providerId = err.message;
    } else if (Object.keys(fieldErrors).length === 0) {
        message = err.message || 'Failed to register patient';
    }

    return { fieldErrors, message };
}