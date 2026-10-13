// patient search list with pagination and debounce

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { searchPatients } from '../../services/patientService';
import { formatPatientId, formatPatientName } from '../../utils/patientFormat';

export default function PatientSearch({
  selectedPatientId,
  onSelectPatient,
  onOpenUpdate,
  refreshTrigger
}) {
  const [searchText, setSearchText] = useState('');
  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // debounce search text and fetch patients
  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setErrorMessage('');

      searchPatients(searchText, page, 10)
        .then(res => {
          if (!isCurrent) return;
          const items = res.items || [];
          setPatients(items);
          setTotalPages(res.total_pages || 1);
          setTotalCount(res.total || 0);
          setIsLoading(false);

          // auto select first patient if none selected
          if (!selectedPatientId && items.length > 0) {
            onSelectPatient(items[0].patient_id);
          }
        })
        .catch(err => {
          if (!isCurrent) return;
          setErrorMessage(err.message || 'Cannot reach the server');
          setIsLoading(false);
        });
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchText, page, refreshTrigger]);

  const handleSearchInput = (e) => {
    setSearchText(e.target.value);
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* search input box */}
      <div className="ds-card p-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search by Patient Code (PAT-XXXX), Name, Contact, or NIC..."
            className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchText}
            onChange={handleSearchInput}
          />
        </div>
      </div>

      {/* patient list table */}
      <div className="ds-card overflow-hidden">
        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 text-xs border-b border-red-200">
            {errorMessage}
          </div>
        )}

        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Patient Code & Name</th>
              <th className="px-4 py-3">NIC Number</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-650">
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  <div className="flex justify-center items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Searching patient records...</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && patients.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No patients found
                </td>
              </tr>
            )}

            {!isLoading && patients.map(p => {
              const isSelected = selectedPatientId === p.patient_id;
              const fullName = formatPatientName(p.first_name, p.last_name);
              return (
                <tr
                  key={p.patient_id}
                  onClick={() => onSelectPatient(p.patient_id)}
                  className={`transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : 'hover:bg-blue-50/25'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {fullName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {fullName}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatPatientId(p.patient_id)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{p.nic}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient(p.patient_id);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Inspect Profile
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUpdate(p.patient_id);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* pagination footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {patients.length} of {totalCount} patients
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={handlePrevPage}
              className="p-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={handleNextPage}
              className="p-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
