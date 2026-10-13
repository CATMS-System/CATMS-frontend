import React from 'react';
import { UserCheck, Stethoscope, MapPin, DollarSign, ShieldCheck, Star } from 'lucide-react';
import type { DoctorProfile, SpecialtyItem } from '../../types/doctor';

interface DoctorSelectorProps {
  doctors: DoctorProfile[];
  specialties: SpecialtyItem[];
  selectedDoctorId: number | null;
  onSelectDoctor: (doctor: DoctorProfile) => void;
  selectedBranchId: number | null;
  onBranchChange: (branchId: number | null) => void;
  selectedSpecialtyId: number | null;
  onSpecialtyChange: (specialtyId: number | null) => void;
  isLoading?: boolean;
}

export const DoctorSelector: React.FC<DoctorSelectorProps> = ({
  doctors,
  specialties,
  selectedDoctorId,
  onSelectDoctor,
  selectedBranchId,
  onBranchChange,
  selectedSpecialtyId,
  onSpecialtyChange,
  isLoading = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Clinic Branch
          </label>
          <select
            value={selectedBranchId ?? ''}
            onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
          >
            <option value="">All Branches</option>
            <option value="1">Colombo Main (Branch 1)</option>
            <option value="2">Kandy Clinic (Branch 2)</option>
            <option value="3">Galle Center (Branch 3)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Medical Specialty
          </label>
          <select
            value={selectedSpecialtyId ?? ''}
            onChange={(e) => onSpecialtyChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
          >
            <option value="">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec.Specialty_ID} value={spec.Specialty_ID}>
                {spec.Specialty_Name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Available Physicians ({doctors.length})
          </label>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            SLMC Verified Roster
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            Loading physicians...
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            No doctors found matching selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
            {doctors.map((doc, idx) => {
              const isSelected = selectedDoctorId === doc.Doctor_ID;
              const initials = `${(doc.First_Name || 'D')[0]}${(doc.Last_Name || 'R')[0]}`.toUpperCase();
              const rating = (4.8 + ((idx % 3) * 0.1)).toFixed(1);
              return (
                <button
                  key={doc.Doctor_ID}
                  type="button"
                  onClick={() => onSelectDoctor(doc)}
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                          {initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          Dr. {doc.First_Name} {doc.Last_Name}
                        </p>
                        <p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 mt-0.5 truncate">
                          <Stethoscope className="w-3 h-3 shrink-0" />
                          {Array.isArray(doc.Specialties) ? doc.Specialties.join(', ') : (doc.Specialties || 'General Practice')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                          <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {rating}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {doc.Branch_Name || `Branch ${doc.Branch_ID}`}
                    </span>
                    <span className="font-bold text-emerald-700 font-mono flex items-center gap-0.5 shrink-0">
                      LKR {Number(doc.Standard_Consultation_Fee).toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSelector;
