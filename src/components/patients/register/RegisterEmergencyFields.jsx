// emergency contact part of the register patient form

import React from 'react';

export default function RegisterEmergencyFields({ form, errors, onChange }) {
    return (
        <div className="border-t border-slate-150 pt-4">
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
                Emergency Contact (Exactly 1 Required)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Contact First Name *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                        value={form.emergencyFirstName}
                        onChange={e => onChange('emergencyFirstName', e.target.value)}
                    />
                    {errors.emergencyFirstName && <span className="text-[11px] text-red-600">{errors.emergencyFirstName}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Contact Last Name *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                        value={form.emergencyLastName}
                        onChange={e => onChange('emergencyLastName', e.target.value)}
                    />
                    {errors.emergencyLastName && <span className="text-[11px] text-red-600">{errors.emergencyLastName}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Relationship *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Spouse, Parent, Friend..."
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                        value={form.emergencyRelation}
                        onChange={e => onChange('emergencyRelation', e.target.value)}
                    />
                    {errors.emergencyRelation && <span className="text-[11px] text-red-600">{errors.emergencyRelation}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Contact Phone *
                    </label>
                    <input
                        type="tel"
                        required
                        placeholder="077 123 4568"
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs font-mono"
                        value={form.emergencyPhone}
                        onChange={e => onChange('emergencyPhone', e.target.value)}
                    />
                    {errors.emergencyPhone && <span className="text-[11px] text-red-600">{errors.emergencyPhone}</span>}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Contact Address (Optional)
                    </label>
                    <input
                        type="text"
                        placeholder="Street, City, Postal Code"
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                        value={form.emergencyStreet}
                        onChange={e => onChange('emergencyStreet', e.target.value)}
                    />
                    {errors.emergencyStreet && <span className="text-[11px] text-red-600">{errors.emergencyStreet}</span>}
                </div>
            </div>
        </div>
    );
}