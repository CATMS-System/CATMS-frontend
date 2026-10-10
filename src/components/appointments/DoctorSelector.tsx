import React from 'react';
import { UserCheck, Stethoscope, MapPin, DollarSign } from 'lucide-react';
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
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Clinic Branch
          </label>
          <select
            value={selectedBranchId ?? ''}
            onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Branches</option>
            <option value="1">Colombo Main (Branch 1)</option>
            <option value="2">Kandy Clinic (Branch 2)</option>
            <option value="3">Galle Center (Branch 3)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Medical Specialty
          </label>
          <select
            value={selectedSpecialtyId ?? ''}
            onChange={(e) => onSpecialtyChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
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
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Available Physicians ({doctors.length})
        </label>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            Loading physicians...
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No doctors found matching selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
            {doctors.map((doc) => {
              const isSelected = selectedDoctorId === doc.Doctor_ID;
              return (
                <button
                  key={doc.Doctor_ID}
                  type="button"
                  onClick={() => onSelectDoctor(doc)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        Dr. {doc.First_Name} {doc.Last_Name}
                      </p>
                      <p className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                        <Stethoscope className="w-3 h-3 shrink-0" />
                        {Array.isArray(doc.Specialties) ? doc.Specialties.join(', ') : (doc.Specialties || 'General Practice')}
                      </p>
                    </div>
                    {isSelected && <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {doc.Branch_Name || `Branch ${doc.Branch_ID}`}
                    </span>
                    <span className="font-medium text-gray-700 flex items-center gap-0.5">
                      <DollarSign className="w-3 h-3 text-gray-400" />
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
