// starting values and validation for the register patient form

import {
    isValidNic,
    isValidPostalCode,
    isValidPhone,
    isValidDob,
    isValidEmail,
    isValidPolicyYear,
    isValidCoverage
} from './patientFormat';

export const INITIAL_FORM = {
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    nic: '',
    contactNumber: '',
    email: '',
    streetAddress: '',
    city: '',
    stateProvince: '',
    postalCode: '',

    // exactly one emergency contact
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyStreet: '',

    // optional insurance policy
    hasInsurance: false,
    providerId: '',
    policyNumber: '',
    policyType: 'Comprehensive',
    startDate: '',
    endDate: '',
    coveragePercent: '80'
};

// returns an object with one message per wrong field, empty when all is fine
export function validateRegisterForm(form) {
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

    if (!form.dob) {
        errors.dob = 'Date of birth is required';
    } else if (!isValidDob(form.dob)) {
        errors.dob = 'Date of birth cannot be in the future or over 120 years ago';
    }

    if (!form.nic.trim()) {
        errors.nic = 'NIC is required';
    } else if (!isValidNic(form.nic)) {
        errors.nic = 'NIC must be 9 digits + V/X or 12 digits';
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

    if (!form.emergencyFirstName.trim()) errors.emergencyFirstName = 'First name is required';
    if (!form.emergencyLastName.trim()) errors.emergencyLastName = 'Last name is required';
    if (!form.emergencyRelation.trim()) errors.emergencyRelation = 'Relationship is required';

    if (!form.emergencyPhone.trim()) {
        errors.emergencyPhone = 'Contact phone is required';
    } else if (!isValidPhone(form.emergencyPhone)) {
        errors.emergencyPhone = 'Enter a valid phone number (7 to 20 digits)';
    }

    if (form.hasInsurance) {
        if (!form.providerId) errors.providerId = 'Select an insurance provider';

        if (!form.policyNumber.trim()) {
            errors.policyNumber = 'Policy number is required';
        } else if (form.policyNumber.trim().length > 50) {
            errors.policyNumber = 'Policy number can be 50 characters at most';
        }

        if (!form.startDate) {
            errors.startDate = 'Start date is required';
        } else if (!isValidPolicyYear(form.startDate)) {
            errors.startDate = 'Start date year looks wrong';
        }

        if (!form.endDate) {
            errors.endDate = 'End date is required';
        } else if (!isValidPolicyYear(form.endDate)) {
            errors.endDate = 'End date year looks wrong';
        } else if (form.startDate && form.endDate < form.startDate) {
            errors.endDate = 'End date cannot be before start date';
        }

        if (!isValidCoverage(form.coveragePercent)) {
            errors.coveragePercent = 'Coverage must be 0 to 100 with up to 2 decimals';
        }
    }

    return errors;
}