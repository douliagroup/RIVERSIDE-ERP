'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast'; // Ou l'outil de notification que vous utilisez

export default function MedicalPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('CONSULTATION'); // 'CONSULTATION' ou 'HISTORIQUE'
  
  // États du formulaire
  const [diagnostic, setDiagnostic] = useState('');
  const [ordonnance, setOrdonnance] = useState('');
  const [tension, setTension] = useState('');
  const [temperature, setTemperature] = useState('');
  const [poids, setPoids] = useState('');
  
  // État pour l'historique
  const [historique, setHistorique] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger l'historique quand on change de patient ou d'onglet
  useEffect(() => {
    if (selectedPatientId && activeTab === 'HISTORIQUE') {
      chargerHistorique(selectedPatientId);
    }
  }, [selectedPatientId, activeTab]);

  const chargerHistorique = async (patientId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement de l'historique");
    } else {
      setHistorique(data || []);
    }
    setIsLoading(false);
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Veuillez d'abord sélectionner un patient.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('consultations')
      .insert([
        {
          patient_id: selectedPatientId,
          diagnostic: diagnostic,
          ordonnance: ordonnance,
          tension: tension,
          temperature: temperature,
          poids: poids,
        }
      ]);

    setIsLoading(false);

    if (error) {
      toast.error(`Erreur d'enregistrement : ${error.message}`);
    } else {
      toast.success("Consultation enregistrée avec succès !");
      // Vider le formulaire après succès
      setDiagnostic('');
      setOrdonnance('');
      setTension('');
      setTemperature('');
      setPoids('');
    }
  };

  // --- RENDU UI ---
  return (
    <div className="p-6">
      {/* ... Votre design d'en-tête et de liste d'attente existant ... */}
      
      {/* Simulation de la sélection d'un patient pour le test */}
      <button 
        onClick={() => setSelectedPatientId('ID_DU_PATIENT_TEST')} 
        className="mb-4 bg-gray-200 p-2 rounded"
      >
        Simuler la sélection d&apos;un patient
      </button>

      {/* Onglets */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('CONSULTATION')}
          className={`px-4 py-2 font-bold ${activeTab === 'CONSULTATION' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
        >
          NOUVELLE CONSULTATION
        </button>
        <button 
          onClick={() => setActiveTab('HISTORIQUE')}
          className={`px-4 py-2 font-bold ${activeTab === 'HISTORIQUE' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
        >
          HISTORIQUE DU PATIENT
        </button>
      </div>

      {/* CONTENU : NOUVELLE CONSULTATION */}
      {activeTab === 'CONSULTATION' && (
        <form onSubmit={handleSaveConsultation} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <input type="text" placeholder="Tension (ex: 12/8)" value={tension} onChange={e => setTension(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Température (°C)" value={temperature} onChange={e => setTemperature(e.target.value)} className="border p-2 rounded" />
            <input type="text" placeholder="Poids (kg)" value={poids} onChange={e => setPoids(e.target.value)} className="border p-2 rounded" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">DIAGNOSTIC ÉTABLI</label>
            <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)} className="w-full border p-3 rounded h-32" required placeholder="Saisissez le diagnostic..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ORDONNANCE RIVERSIDE</label>
            <textarea value={ordonnance} onChange={e => setOrdonnance(e.target.value)} className="w-full border p-3 rounded h-32" required placeholder="Saisissez la prescription..." />
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-red-700 text-white font-bold py-3 rounded hover:bg-red-800 disabled:opacity-50">
            {isLoading ? 'ENREGISTREMENT...' : 'VALIDER LA CONSULTATION'}
          </button>
        </form>
      )}

      {/* CONTENU : HISTORIQUE */}
      {activeTab === 'HISTORIQUE' && (
        <div className="space-y-4">
          {isLoading ? (
            <p>Chargement de l&apos;historique...</p>
          ) : historique.length === 0 ? (
            <div className="bg-gray-50 text-center p-10 rounded-lg text-gray-500">
              AUCUN ANTÉCÉDENT TROUVÉ POUR CE PATIENT
            </div>
          ) : (
            historique.map((consult, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-slate-800">
                <p className="text-sm text-gray-500 font-bold mb-2">
                  Date: {new Date(consult.created_at).toLocaleDateString()}
                </p>
                <p><strong>Diagnostic:</strong> {consult.diagnostic}</p>
                <p className="mt-2 text-gray-700 whitespace-pre-line"><strong>Ordonnance:</strong> {consult.ordonnance}</p>
                <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>Tension: {consult.tension || 'N/A'}</span>
                  <span>Temp: {consult.temperature || 'N/A'}</span>
                  <span>Poids: {consult.poids || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}