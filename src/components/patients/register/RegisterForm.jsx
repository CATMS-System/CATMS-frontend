// step 1 of registration, all the form sections and the buttons

import React from 'react';
import RegisterPersonalFields from './RegisterPersonalFields';
import RegisterAddressFields from './RegisterAddressFields';
import RegisterEmergencyFields from './RegisterEmergencyFields';
import RegisterInsuranceFields from './RegisterInsuranceFields';

export default function RegisterForm({
    form,
    errors,
    providers,
    onChange,
    onSubmit,
    onCancel,
    onOpenNewProvider
}) {
    return (
        <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto">
            <RegisterPersonalFields form={form} errors={errors} onChange={onChange} />
            <RegisterAddressFields form={form} errors={errors} onChange={onChange} />
            <RegisterEmergencyFields form={form} errors={errors} onChange={onChange} />
            <RegisterInsuranceFields
                form={form}
                errors={errors}
                providers={providers}
                onChange={onChange}
                onOpenNewProvider={onOpenNewProvider}
            />

            <div className="pt-4 border-t border-slate-150 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                    Review & Confirm
                </button>
            </div>
        </form>
    );
}