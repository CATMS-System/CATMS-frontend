import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, Clock, AlertCircle, Building2, Calendar, Stethoscope } from 'lucide-react';
import { QueueStatusBadge } from './QueueStatusBadge';
import { getDailyQueue } from '../../services/appointmentService';
import type { QueueItem } from '../../types/appointment';

interface ClinicQueueTableProps {
  branchId?: number;
  initialDate?: string;
  onSelectAppointment?: (item: QueueItem) => void;
}

export const ClinicQueueTable: React.FC<ClinicQueueTableProps> = ({
  branchId = 1,
  initialDate,
  onSelectAppointment,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedBranchId, setSelectedBranchId] = useState<number>(branchId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDailyQueue(selectedBranchId, selectedDate);
      setQueueItems(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load clinic queue:', err);
      setError(err?.message || 'Unable to fetch waiting queue.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, selectedDate]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue]);

  const scheduledCount = queueItems.filter((q) => q.Appointment_Type.toLowerCase() !== 'walk_in').length;
  const walkInCount = queueItems.filter((q) => q.Appointment_Type.toLowerCase() === 'walk_in').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden space-y-0">
      {/* Table Header and Control Toolbar */}
      <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-base">Live Clinic Waiting Queue</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {queueItems.length} Waiting
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time consultation sequencing for reception desk and physician workbench
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="1">Colombo Main (Branch 1)</option>
            <option value="2">Kandy Clinic (Branch 2)</option>
            <option value="3">Galle Center (Branch 3)</option>
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
          />

          <button
            type="button"
            onClick={() => fetchQueue()}
            disabled={isLoading}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-200/60 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Refresh queue now"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Auto (30s)</span>
          </label>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-100 text-center py-2.5 bg-white text-xs">
        <div>
          <span className="text-gray-500">Total in Queue: </span>
          <span className="font-bold text-gray-900">{queueItems.length}</span>
        </div>
        <div>
          <span className="text-gray-500">Scheduled: </span>
          <span className="font-bold text-blue-600">{scheduledCount}</span>
        </div>
        <div>
          <span className="text-gray-500">Emergency / Walk-in: </span>
          <span className="font-bold text-amber-600">{walkInCount}</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 m-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b border-gray-200 tracking-wider">
            <tr>
              <th className="py-3 px-4">Token #</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Assigned Doctor</th>
              <th className="py-3 px-4">Reason for Visit</th>
              <th className="py-3 px-4">Type & Wait</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && queueItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading waiting queue...
                </td>
              </tr>
            ) : queueItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No patients currently waiting in queue for the selected branch and date.
                </td>
              </tr>
            ) : (
              queueItems.map((item) => (
                <tr
                  key={item.Appointment_ID}
                  onClick={() => onSelectAppointment && onSelectAppointment(item)}
                  className={`hover:bg-blue-50/40 transition-colors ${
                    onSelectAppointment ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className="font-bold text-blue-700 font-mono text-sm">
                      Q-{String(item.Queue_Number).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{item.Patient_Name}</p>
                    <p className="text-[11px] text-gray-400">
                      ID: #{item.Patient_ID} {item.Patient_Phone ? `| ${item.Patient_Phone}` : ''}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800">{item.Doctor_Name}</p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-gray-400" />
                      {item.Branch_Name}
                    </p>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-gray-700">
                    {item.Reason_For_Visit}
                  </td>
                  <td className="py-3 px-4">
                    <QueueStatusBadge
                      appointmentType={item.Appointment_Type}
                      status={item.Status}
                      estimatedWaitMinutes={item.Estimated_Wait_Minutes}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-block px-2 py-0.5 rounded font-medium text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.Status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {lastRefreshed && (
        <div className="p-2.5 bg-gray-50 text-right text-[11px] text-gray-400 border-t border-gray-100">
          Last updated at {lastRefreshed}
        </div>
      )}
    </div>
  );
};

export default ClinicQueueTable;
