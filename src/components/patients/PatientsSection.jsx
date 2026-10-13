// patients screen with search list, profile card and all patient modals

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { getPatient } from '../../services/patientService';
import { formatPatientId, formatPatientName } from '../../utils/patientFormat';
import PatientSearch from './PatientSearch';
import PatientProfileCard from './PatientProfileCard';
import RegisterPatientModal from './RegisterPatientModal';
import UpdatePatientModal from './UpdatePatientModal';
import AddPolicyModal from './AddPolicyModal';
import ProviderModal from './ProviderModal';
import { ensureMotionSafeEnv } from '../../theme/designSystem';

export default function PatientsSection({ triggerToast, addAuditLog, onPatientsChanged }) {
    ensureMotionSafeEnv();
    const [selectedId, setSelectedId] = useState(null);
    const [patient, setPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [profileVersion, setProfileVersion] = useState(0);
    const [listVersion, setListVersion] = useState(0);
    const [showRegister, setShowRegister] = useState(false);
    const [editPatient, setEditPatient] = useState(null);
    const [editKey, setEditKey] = useState(0);
    const [policyPatientId, setPolicyPatientId] = useState(null);
    const [policyKey, setPolicyKey] = useState(0);
    const [showProvider, setShowProvider] = useState(false);

    // load the full patient for the profile card
    useEffect(() => {
        if (!selectedId) return;
        let isCurrent = true;
        setIsLoading(true);
        getPatient(selectedId)
            .then(data => isCurrent && setPatient(data))
            .catch(() => isCurrent && setPatient(null))
            .finally(() => isCurrent && setIsLoading(false));
        return () => {
            isCurrent = false;
        };
    }, [selectedId, profileVersion]);

    const refreshAll = () => {
        setProfileVersion(v => v + 1);
        setListVersion(v => v + 1);
        onPatientsChanged();
    };

    // the list rows have no updated_at, so load the full patient before editing
    const openUpdate = (patientId) => {
        getPatient(patientId)
            .then(data => setEditPatient(data))
            .catch(err => triggerToast(err.message));
    };

    const handleRegistered = (created) => {
        const name = formatPatientName(created.first_name, created.last_name);
        addAuditLog('CREATE_PATIENT', `Registered new patient ${name}`, 'null', JSON.stringify(created));
        const username = created.portal_access?.username || `pat_${created.nic?.toLowerCase()}`;
        triggerToast(`Patient registered! Code: ${formatPatientId(created.patient_id)} | Login: ${username}`);
        // the first password is only returned once, so keep it on screen until reception closes it
        if (created.temporary_password) {
            window.alert(`Give these login details to the patient:\n\nUsername: ${username}\nPassword: ${created.temporary_password}\n\nThis password will not be shown again.`);
        }
        setSelectedId(created.patient_id);
        refreshAll();
    };

    const handleSaved = (updated) => {
        addAuditLog('UPDATE_PATIENT', `Updated details for patient ${formatPatientId(updated.patient_id)}`, JSON.stringify(editPatient), JSON.stringify(updated));
        triggerToast('Patient profile updated successfully!');
        refreshAll();
    };

    // someone else saved first, so show the newest details in a fresh modal
    const handleConflict = (newest) => {
        triggerToast('This patient was changed by someone else, check the newest details');
        setEditPatient(newest);
        setEditKey(k => k + 1);
        refreshAll();
    };

    const handlePolicyAdded = () => {
        triggerToast('Insurance policy added successfully!');
        setProfileVersion(v => v + 1);
        onPatientsChanged();
    };

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 shadow-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Patient Records &amp; Onboarding</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Patient Directory &amp; Registry</h1>
                    <p className="text-sm text-slate-300 mt-1">Cross-branch patient lookups, new member onboarding, and profile configurations</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    className="relative z-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center space-x-2 shadow-sm cursor-pointer transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Onboard New Patient</span>
                </button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PatientSearch
                        selectedPatientId={selectedId}
                        onSelectPatient={setSelectedId}
                        onOpenUpdate={openUpdate}
                        refreshTrigger={listVersion}
                    />
                </div>
                <PatientProfileCard
                    patient={patient}
                    isLoading={isLoading}
                    onOpenUpdate={openUpdate}
                    onOpenAddPolicy={setPolicyPatientId}
                />
            </div>

            <RegisterPatientModal
                isOpen={showRegister}
                onClose={() => setShowRegister(false)}
                onSuccess={handleRegistered}
            />

            {editPatient && (
                <UpdatePatientModal
                    key={`edit-${editKey}`}
                    patient={editPatient}
                    onClose={() => setEditPatient(null)}
                    onSaved={handleSaved}
                    onConflict={handleConflict}
                />
            )}

            <AddPolicyModal
                key={`policy-${policyKey}`}
                isOpen={policyPatientId !== null}
                patientId={policyPatientId}
                onClose={() => setPolicyPatientId(null)}
                onSuccess={handlePolicyAdded}
                onOpenNewProvider={() => setShowProvider(true)}
            />

            <ProviderModal
                isOpen={showProvider}
                onClose={() => setShowProvider(false)}
                onSuccess={() => setPolicyKey(k => k + 1)}
            />
        </div>
    );
}