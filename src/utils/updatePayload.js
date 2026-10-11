// builds the update request body and reads errors that come back

// api field name (with its path) to the form field name
const FIELD_NAMES = {
    first_name: 'firstName',
    last_name: 'lastName',
    contact_number: 'contactNumber',
    email: 'email',
    street_address: 'streetAddress',
    city: 'city',
    state_province: 'stateProvince',
    postal_code: 'postalCode',
    'emergency_contact.first_name': 'contactFirstName',
    'emergency_contact.last_name': 'contactLastName',
    'emergency_contact.relationship_to_patient': 'contactRelation',
    'emergency_contact.contact_number': 'contactPhone',
    'emergency_contact.street_address': 'contactStreet'
};

// returns only the fields that changed, or null when nothing changed
export function buildUpdateBody(form, patient) {
    const body = {};

    if (form.firstName.trim() !== patient.first_name) body.first_name = form.firstName.trim();
    if (form.lastName.trim() !== patient.last_name) body.last_name = form.lastName.trim();
    if (form.contactNumber.trim() !== patient.contact_number) body.contact_number = form.contactNumber.trim();
    if (form.streetAddress.trim() !== patient.street_address) body.street_address = form.streetAddress.trim();
    if (form.city.trim() !== patient.city) body.city = form.city.trim();
    if (form.stateProvince.trim() !== patient.state_province) body.state_province = form.stateProvince.trim();
    if (form.postalCode.trim() !== patient.postal_code) body.postal_code = form.postalCode.trim();

    // an empty email clears it, so null is sent
    if (form.email.trim() !== (patient.email || '')) body.email = form.email.trim() || null;

    if (form.contactId) {
        const contact = patient.emergency_contacts[0];
        const changes = {};

        if (form.contactFirstName.trim() !== contact.first_name) changes.first_name = form.contactFirstName.trim();
        if (form.contactLastName.trim() !== contact.last_name) changes.last_name = form.contactLastName.trim();
        if (form.contactRelation.trim() !== contact.relationship_to_patient) {
            changes.relationship_to_patient = form.contactRelation.trim();
        }
        if (form.contactPhone.trim() !== contact.contact_number) changes.contact_number = form.contactPhone.trim();
        if (form.contactStreet.trim() !== (contact.street_address || '')) {
            changes.street_address = form.contactStreet.trim() || null;
        }

        if (Object.keys(changes).length > 0) {
            body.emergency_contact = { emergency_contact_id: form.contactId, ...changes };
        }
    }

    if (Object.keys(body).length === 0) return null;

    // the time from the last load, sent back unchanged so the server can spot a conflict
    body.last_known_updated_at = patient.updated_at;
    return body;
}

// returns messages for the form fields, a message for the banner and if it was a conflict
export function readUpdateError(err) {
    const fieldErrors = {};

    for (const key in err.fieldErrors) {
        if (FIELD_NAMES[key]) fieldErrors[FIELD_NAMES[key]] = err.fieldErrors[key];
    }

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    return {
        fieldErrors,
        message: hasFieldErrors ? '' : err.message || 'Failed to update patient',
        isConflict: err.status === 409
    };
}