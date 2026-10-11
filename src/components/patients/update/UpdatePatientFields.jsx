import React from 'react';
import { SRI_LANKA_PROVINCES } from '../../../utils/patientFormat';

export default function UpdatePatientFields({ form, errors, onChange }) {
    return (
        <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.firstName}
                        onChange={e => onChange('firstName', e.target.value)}
                    />
                    {errors.firstName && <span className="text-[11px] text-red-600">{errors.firstName}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.lastName}
                        onChange={e => onChange('lastName', e.target.value)}
                    />
                    {errors.lastName && <span className="text-[11px] text-red-600">{errors.lastName}</span>}
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Contact Phone
                </label>
                <input
                    type="tel"
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                    value={form.contactNumber}
                    onChange={e => onChange('contactNumber', e.target.value)}
                />
                {errors.contactNumber && <span className="text-[11px] text-red-600">{errors.contactNumber}</span>}
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Email (clear to remove)
                </label>
                <input
                    type="email"
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                    value={form.email}
                    onChange={e => onChange('email', e.target.value)}
                />
                {errors.email && <span className="text-[11px] text-red-600">{errors.email}</span>}
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Street Address
                </label>
                <input
                    type="text"
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                    value={form.streetAddress}
                    onChange={e => onChange('streetAddress', e.target.value)}
                />
                {errors.streetAddress && <span className="text-[11px] text-red-600">{errors.streetAddress}</span>}
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">City</label>
                    <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.city}
                        onChange={e => onChange('city', e.target.value)}
                    />
                    {errors.city && <span className="text-[11px] text-red-600">{errors.city}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Province</label>
                    <select
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer"
                        value={form.stateProvince || ''}
                        onChange={e => onChange('stateProvince', e.target.value)}
                    >
                        <option value="">Select Province</option>
                        {SRI_LANKA_PROVINCES.map(prov => (
                            <option key={prov} value={prov}>{prov}</option>
                        ))}
                    </select>
                    {errors.stateProvince && <span className="text-[11px] text-red-600">{errors.stateProvince}</span>}
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Postal</label>
                    <input
                        type="text"
                        maxLength={5}
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.postalCode}
                        onChange={e => onChange('postalCode', e.target.value)}
                    />
                    {errors.postalCode && <span className="text-[11px] text-red-600">{errors.postalCode}</span>}
                </div>
            </div>
        </div>
    );
}