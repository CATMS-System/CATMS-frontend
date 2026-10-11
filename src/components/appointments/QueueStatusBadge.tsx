import React from 'react';
import { Zap, Calendar, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface QueueStatusBadgeProps {
  appointmentType: string;
  status?: string;
  estimatedWaitMinutes?: number;
}

export const QueueStatusBadge: React.FC<QueueStatusBadgeProps> = ({
  appointmentType,
  status,
  estimatedWaitMinutes,
}) => {
  const isWalkIn = appointmentType.toLowerCase() === 'walk_in';
  const isEmergency = appointmentType.toLowerCase() === 'emergency';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
      {isWalkIn ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Zap className="w-3 h-3 text-amber-600 shrink-0" />
          WALK_IN
        </span>
      ) : isEmergency ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
          EMERGENCY
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
          SCHEDULED
        </span>
      )}

      {estimatedWaitMinutes !== undefined && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
          {estimatedWaitMinutes === 0 ? 'Next Up' : `~${estimatedWaitMinutes} min`}
        </span>
      )}
    </div>
  );
};

export default QueueStatusBadge;
