import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';

export default function LanguageSelector({ variant = 'default' }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const isPortal = variant === 'portal';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select Language"
        className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
          isPortal
            ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/80 shadow-xs backdrop-blur-xs'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <Globe className="h-4 w-4 text-blue-600 shrink-0" />
        <span className={`font-medium tracking-wide ${isPortal ? '' : 'hidden sm:inline'}`}>{currentLang.nativeName}</span>
        {!isPortal && (
          <span className="font-bold tracking-wider sm:hidden uppercase text-[11px]">{currentLang.code}</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-fade-in"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Select Language
            </span>
          </div>
          {SUPPORTED_LANGUAGES.map((langItem) => {
            const isSelected = langItem.code === language;
            return (
              <button
                key={langItem.code}
                role="menuitem"
                type="button"
                onClick={() => {
                  setLanguage(langItem.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{langItem.nativeName}</span>
                  {langItem.code !== 'en' && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({langItem.label})
                    </span>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
