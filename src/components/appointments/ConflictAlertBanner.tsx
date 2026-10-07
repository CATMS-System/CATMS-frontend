import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface ConflictAlertBannerProps {
  conflictMessage: string | null;
  formError?: string | null;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({
  conflictMessage,
  formError,
}) => {
  if (!conflictMessage && !formError) return null;

  return (
    <div className="space-y-2">
      {conflictMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-xs tracking-wide uppercase text-red-900">
              Schedule Collision Alert (HTTP 409 Conflict)
            </p>
            <p className="text-xs text-red-700 mt-0.5">{conflictMessage}</p>
          </div>
        </div>
      )}

      {formError && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}
    </div>
  );
};

export default ConflictAlertBanner;
