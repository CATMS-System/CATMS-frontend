// personal details part of the register patient form

import React from 'react';

export default function RegisterPersonalFields({ form, errors, onChange }) {
    return (
        <div>
            <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
                Personal Demographics
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        First Name *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.firstName}
                        onChange={e => onChange('firstName', e.target.value)}
                    />
                    {errors.firstName && <span className="text-[11px] text-red-600">{errors.firstName}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Last Name *
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={form.lastName}
                        onChange={e => onChange('lastName', e.target.value)}
                    />
                    {errors.lastName && <span className="text-[11px] text-red-600">{errors.lastName}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        NIC Number *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. 852140938V or 198521409380"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.nic}
                        onChange={e => onChange('nic', e.target.value)}
                    />
                    {errors.nic && <span className="text-[11px] text-red-600">{errors.nic}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Contact Phone *
                    </label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. +94 77 123 4567"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.contactNumber}
                        onChange={e => onChange('contactNumber', e.target.value)}
                    />
                    {errors.contactNumber && <span className="text-[11px] text-red-600">{errors.contactNumber}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Date of Birth *
                    </label>
                    <input
                        type="date"
                        required
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.dob}
                        onChange={e => onChange('dob', e.target.value)}
                    />
                    {errors.dob && <span className="text-[11px] text-red-600">{errors.dob}</span>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Gender *
                    </label>
                    <select
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                        value={form.gender}
                        onChange={e => onChange('gender', e.target.value)}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Email Address (Optional)
                    </label>
                    <input
                        type="email"
                        placeholder="patient@example.com"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={form.email}
                        onChange={e => onChange('email', e.target.value)}
                    />
                    {errors.email && <span className="text-[11px] text-red-600">{errors.email}</span>}
                </div>
            </div>
        </div>
    );
}