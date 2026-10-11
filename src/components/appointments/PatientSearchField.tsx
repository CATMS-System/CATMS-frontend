import React, { useState, useMemo } from 'react';
import { Search, User, X, Check } from 'lucide-react';

export interface PatientOption {
  Patient_ID: number;
  Full_Name: string;
  NIC?: string | null;
  Contact_Number?: string | null;
}

interface PatientSearchFieldProps {
  patients: PatientOption[];
  selectedPatient: PatientOption | null;
  onSelectPatient: (patient: PatientOption | null) => void;
  error?: string | null;
}

export const PatientSearchField: React.FC<PatientSearchFieldProps> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return patients.filter((p) =>
      p.Full_Name.toLowerCase().includes(q) ||
      (p.NIC && p.NIC.toLowerCase().includes(q)) ||
      (p.Contact_Number && p.Contact_Number.includes(q))
    ).slice(0, 6);
  }, [patients, searchQuery]);

  if (selectedPatient) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Selected Patient
        </label>
        <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {selectedPatient.Full_Name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedPatient.Full_Name}</p>
              <p className="text-xs text-gray-500">
                ID: #{selectedPatient.Patient_ID} {selectedPatient.NIC ? `| NIC: ${selectedPatient.NIC}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectPatient(null)}
            className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors"
            title="Change patient"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
        Search & Select Patient *
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by Patient Name, NIC, or Phone..."
          className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
      </div>

      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}

      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">No matching patients found</div>
          ) : (
            filteredPatients.map((p) => (
              <button
                key={p.Patient_ID}
                type="button"
                onClick={() => {
                  onSelectPatient(p);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50/70 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-gray-900">{p.Full_Name}</span>
                  <span className="text-gray-400 ml-2">ID: #{p.Patient_ID}</span>
                  {p.NIC && <span className="text-gray-500 ml-2">({p.NIC})</span>}
                </div>
                <User className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSearchField;
