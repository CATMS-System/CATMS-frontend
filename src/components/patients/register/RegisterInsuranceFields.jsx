// optional insurance policy part of the register patient form

import React from 'react';
import { Plus, Shield } from 'lucide-react';

export default function RegisterInsuranceFields({ form, errors, providers, onChange, onOpenNewProvider }) {
    return (
        <div className="border-t border-slate-150 pt-4 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center">
                    <Shield className="h-3.5 w-3.5 text-blue-600 mr-1" />
                    Insurance Coverage (Optional)
                </span>
                <label className="text-xs text-slate-600 flex items-center space-x-1.5 cursor-pointer font-medium">
                    <input
                        type="checkbox"
                        checked={form.hasInsurance}
                        onChange={e => onChange('hasInsurance', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Attach Insurance Policy</span>
                </label>
            </div>

            {form.hasInsurance && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex justify-between items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Insurance Provider *
                            </label>
                            <select
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                                value={form.providerId}
                                onChange={e => onChange('providerId', e.target.value)}
                            >
                                <option value="">Select Insurance Provider...</option>
                                {providers.map(p => (
                                    <option key={p.provider_id} value={p.provider_id}>
                                        {p.provider_name}
                                    </option>
                                ))}
                            </select>
                            {errors.providerId && <span className="text-[11px] text-red-600">{errors.providerId}</span>}
                        </div>
                        <button
                            type="button"
                            onClick={onOpenNewProvider}
                            className="text-xs text-blue-600 hover:text-blue-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium flex items-center shrink-0 cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New Provider
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Policy Number *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. UA-88321-A"
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono bg-white"
                                value={form.policyNumber}
                                onChange={e => onChange('policyNumber', e.target.value)}
                            />
                            {errors.policyNumber && <span className="text-[11px] text-red-600">{errors.policyNumber}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Policy Type *
                            </label>
                            <select
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
                                value={form.policyType}
                                onChange={e => onChange('policyType', e.target.value)}
                            >
                                <option value="Comprehensive">Comprehensive</option>
                                <option value="Outpatient_Only">Outpatient Only</option>
                                <option value="Catastrophic">Catastrophic</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono bg-white"
                                value={form.startDate}
                                onChange={e => onChange('startDate', e.target.value)}
                            />
                            {errors.startDate && <span className="text-[11px] text-red-600">{errors.startDate}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                End Date *
                            </label>
                            <input
                                type="date"
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono bg-white"
                                value={form.endDate}
                                onChange={e => onChange('endDate', e.target.value)}
                            />
                            {errors.endDate && <span className="text-[11px] text-red-600">{errors.endDate}</span>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Default Coverage % (0 to 100) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="80"
                                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono bg-white"
                                value={form.coveragePercent}
                                onChange={e => onChange('coveragePercent', e.target.value)}
                            />
                            {errors.coveragePercent && <span className="text-[11px] text-red-600">{errors.coveragePercent}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}