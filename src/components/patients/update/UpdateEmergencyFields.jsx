// emergency contact part of the update form

import React from 'react';

export default function UpdateEmergencyFields({ form, errors, onChange }) {
    return (
        <div className="border-t border-slate-150 pt-3 space-y-3 text-xs">
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                Emergency Contact
            </span>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.contactFirstName}
                        onChange={e => onChange('contactFirstName', e.target.value)}
                    />
                    {errors.contactFirstName && <span className="text-[11px] text-red-600">{errors.contactFirstName}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.contactLastName}
                        onChange={e => onChange('contactLastName', e.target.value)}
                    />
                    {errors.contactLastName && <span className="text-[11px] text-red-600">{errors.contactLastName}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Relationship</label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.contactRelation}
                        onChange={e => onChange('contactRelation', e.target.value)}
                    />
                    {errors.contactRelation && <span className="text-[11px] text-red-600">{errors.contactRelation}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                    <input
                        type="tel"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.contactPhone}
                        onChange={e => onChange('contactPhone', e.target.value)}
                    />
                    {errors.contactPhone && <span className="text-[11px] text-red-600">{errors.contactPhone}</span>}
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Address (Optional)
                    </label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.contactStreet}
                        onChange={e => onChange('contactStreet', e.target.value)}
                    />
                    {errors.contactStreet && <span className="text-[11px] text-red-600">{errors.contactStreet}</span>}
                </div>
            </div>
        </div>
    );
}