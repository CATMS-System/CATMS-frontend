import React from 'react';
import { ShieldAlert, AlertCircle, Clock } from 'lucide-react';

export type TriageUrgency = 'Normal' | 'High' | 'Critical';

interface TriageUrgencySelectorProps {
  value: TriageUrgency;
  onChange: (val: TriageUrgency) => void;
}

export const TriageUrgencySelector: React.FC<TriageUrgencySelectorProps> = ({
  value,
  onChange,
}) => {
  const urgencyOptions: Array<{
    level: TriageUrgency;
    label: string;
    description: string;
    activeClass: string;
    icon: React.ReactNode;
  }> = [
    {
      level: 'Normal',
      label: 'Routine Walk-In',
      description: 'Standard queue sequence without escalation',
      activeClass: 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600',
      icon: <Clock className="w-4 h-4 text-blue-600 shrink-0" />,
    },
    {
      level: 'High',
      label: 'Urgent Priority',
      description: 'Acute discomfort requiring expedited consultation',
      activeClass: 'border-amber-500 bg-amber-50/70 text-amber-900 ring-1 ring-amber-500',
      icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />,
    },
    {
      level: 'Critical',
      label: 'Critical / Immediate',
      description: 'Severe triage status requiring immediate doctor review',
      activeClass: 'border-red-600 bg-red-50/70 text-red-900 ring-1 ring-red-600',
      icon: <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />,
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
        Triage Urgency Level *
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {urgencyOptions.map((opt) => {
          const isSelected = value === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              onClick={() => onChange(opt.level)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? opt.activeClass
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {opt.icon}
                <span className="text-xs font-semibold">{opt.label}</span>
              </div>
              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TriageUrgencySelector;
