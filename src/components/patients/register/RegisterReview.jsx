// step 2 of registration, shows every value before saving

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatAddress } from '../../../utils/patientFormat';

export default function RegisterReview({ form, providerName, isSubmitting, onBack, onConfirm }) {
    return (
        <div className="p-6 space-y-4 overflow-y-auto">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                    <strong className="block font-semibold">Important Notice Regarding Permanent Fields</strong>
                    <span>
                        NIC Number, Date of Birth, and Gender cannot be modified after registration. Please verify them carefully before proceeding.
                    </span>
                </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Full Name</span>
                        <span className="font-semibold text-slate-900 text-sm">
                            {form.firstName} {form.lastName}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">NIC Number (Locked)</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{form.nic.toUpperCase()}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Date of Birth (Locked)</span>
                        <span className="font-mono text-slate-800">{form.dob}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Gender (Locked)</span>
                        <span className="text-slate-800">{form.gender}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Phone</span>
                        <span className="font-mono text-slate-800">{form.contactNumber}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Email</span>
                        <span className="font-mono text-slate-800">{form.email || 'Not provided'}</span>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Address</span>
                    <span className="text-slate-800">
                        {formatAddress(form.streetAddress, form.city, form.stateProvince, form.postalCode)}
                    </span>
                </div>

                <div className="border-t border-slate-200 pt-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Emergency Contact</span>
                    <span className="font-semibold text-slate-800">
                        {form.emergencyFirstName} {form.emergencyLastName} ({form.emergencyRelation})
                    </span>
                    <span className="font-mono text-slate-600 block mt-0.5">Phone: {form.emergencyPhone}</span>
                    {form.emergencyStreet && (
                        <span className="text-slate-600 block mt-0.5">{form.emergencyStreet}</span>
                    )}
                </div>

                {form.hasInsurance && (
                    <div className="border-t border-slate-200 pt-2">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Insurance Policy</span>
                        <span className="font-semibold text-slate-800">{providerName}</span>
                        <span className="font-mono text-slate-600 block mt-0.5">
                            Policy No: {form.policyNumber} | Type: {form.policyType.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-slate-600 block">
                            Dates: {form.startDate} to {form.endDate} | Coverage: {form.coveragePercent}%
                        </span>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-slate-150 flex justify-end space-x-3">
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onBack}
                    className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                    Back to Edit
                </button>
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onConfirm}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    <span>{isSubmitting ? 'Registering...' : 'Confirm & Register'}</span>
                </button>
            </div>
        </div>
    );
}