// starting values and validation for the update patient form

import { isValidPostalCode, isValidPhone, isValidEmail } from './patientFormat';

// copies the saved patient into form fields, the emergency contact is the first one
export function makeUpdateForm(patient) {
    const contact = patient.emergency_contacts && patient.emergency_contacts[0];

    return {
        firstName: patient.first_name,
        lastName: patient.last_name,
        contactNumber: patient.contact_number,
        email: patient.email || '',
        streetAddress: patient.street_address,
        city: patient.city,
        stateProvince: patient.state_province,
        postalCode: patient.postal_code,

        contactId: contact ? contact.emergency_contact_id : null,
        contactFirstName: contact ? contact.first_name : '',
        contactLastName: contact ? contact.last_name : '',
        contactRelation: contact ? contact.relationship_to_patient : '',
        contactPhone: contact ? contact.contact_number : '',
        contactStreet: contact ? contact.street_address || '' : ''
    };
}

// returns an object with one message per wrong field, empty when all is fine
export function validateUpdateForm(form) {
    const errors = {};

    if (!form.firstName.trim()) {
        errors.firstName = 'First name is required';
    } else if (form.firstName.trim().length > 50) {
        errors.firstName = 'First name can be 50 characters at most';
    }

    if (!form.lastName.trim()) {
        errors.lastName = 'Last name is required';
    } else if (form.lastName.trim().length > 50) {
        errors.lastName = 'Last name can be 50 characters at most';
    }

    if (!form.contactNumber.trim()) {
        errors.contactNumber = 'Phone number is required';
    } else if (!isValidPhone(form.contactNumber)) {
        errors.contactNumber = 'Enter a valid phone number (7 to 20 digits)';
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
        errors.email = 'Enter a valid email address';
    }

    if (!form.streetAddress.trim()) errors.streetAddress = 'Street address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.stateProvince.trim()) errors.stateProvince = 'Province is required';

    if (!form.postalCode.trim()) {
        errors.postalCode = 'Postal code is required';
    } else if (!isValidPostalCode(form.postalCode)) {
        errors.postalCode = 'Postal code must be exactly 5 digits';
    }

    if (form.contactId) {
        if (!form.contactFirstName.trim()) errors.contactFirstName = 'First name is required';
        if (!form.contactLastName.trim()) errors.contactLastName = 'Last name is required';
        if (!form.contactRelation.trim()) errors.contactRelation = 'Relationship is required';

        if (!form.contactPhone.trim()) {
            errors.contactPhone = 'Contact phone is required';
        } else if (!isValidPhone(form.contactPhone)) {
            errors.contactPhone = 'Enter a valid phone number (7 to 20 digits)';
        }
    }

    return errors;
}