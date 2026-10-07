import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AvailableSlot, DoctorProfile } from '../../types/doctor';

interface TimeSlotPickerProps {
  selectedDoctor: DoctorProfile | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot) => void;
  availableSlots: AvailableSlot[];
  isLoading?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDoctor,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSelectSlot,
  availableSlots,
  isLoading = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Appointment Date
          </label>
          <div className="relative">
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-gray-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 self-end sm:self-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
            Booked
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Available Time Slots ({availableSlots.length})
        </label>

        {!selectedDoctor ? (
          <div className="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
            <Clock className="w-6 h-6 text-gray-300" />
            <span>Select a physician above to inspect available clinic shifts and consultation slots.</span>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            Fetching available slots for {selectedDate}...
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="p-8 text-center text-sm text-amber-700 bg-amber-50/60 rounded-lg border border-amber-200 flex flex-col items-center justify-center gap-1.5">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-medium">No available slots on this date</span>
            <span className="text-xs text-amber-600">The physician may not have scheduled shifts or all slots are already booked.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {availableSlots.map((slot) => {
              const isSelected =
                selectedSlot?.Start_Time === slot.Start_Time &&
                selectedSlot?.Date === slot.Date;

              return (
                <button
                  key={`${slot.Date}-${slot.Start_Time}`}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-900 hover:bg-emerald-100/70 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-sm font-semibold tracking-wide">
                    {slot.Start_Time.slice(0, 5)} - {slot.End_Time.slice(0, 5)}
                  </span>
                  <span className={`text-[11px] flex items-center gap-1 ${isSelected ? 'text-blue-100' : 'text-emerald-700'}`}>
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Selected
                      </>
                    ) : (
                      `${slot.Duration_Minutes} mins`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
