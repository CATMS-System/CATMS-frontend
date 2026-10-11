// read only part of the update form, these values cannot change after registration

import React from 'react';
import { Lock } from 'lucide-react';

export default function UpdateLockedFields({ patient }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center text-slate-500 mb-1">
                <Lock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    Permanent Fields (Cannot Be Changed)
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-slate-700">
                <div>
                    <span className="text-slate-400 text-[10px] block uppercase">NIC</span>
                    <strong>{patient.nic}</strong>
                </div>
                <div>
                    <span className="text-slate-400 text-[10px] block uppercase">DOB</span>
                    <strong>{patient.date_of_birth}</strong>
                </div>
                <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Gender</span>
                    <strong>{patient.gender}</strong>
                </div>
            </div>
        </div>
    );
}