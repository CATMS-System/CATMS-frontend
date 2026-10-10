// address part of the register patient form

import React from 'react';
import { SRI_LANKA_PROVINCES } from '../../../utils/patientFormat';

export default function RegisterAddressFields({ form, errors, onChange }) {
    return (
        <div className="border-t border-slate-150 pt-4">
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
                Residential Address
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Street Address *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="12 Galle Road, Flat 4B"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.streetAddress}
                        onChange={e => onChange('streetAddress', e.target.value)}
                    />
                    {errors.streetAddress && <span className="text-[11px] text-red-600">{errors.streetAddress}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        City *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Colombo"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.city}
                        onChange={e => onChange('city', e.target.value)}
                    />
                    {errors.city && <span className="text-[11px] text-red-600">{errors.city}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Province / State *
                    </label>
                    <select
                        required
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer"
                        value={form.stateProvince}
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
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Postal Code (5 Digits) *
                    </label>
                    <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="00300"
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