"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Receipt, Search, Plus, Trash2, User, X, CreditCard, CheckCircle, 
  Loader2, FileText, ShoppingBag, ShieldCheck, Activity, ArrowLeft, 
  PlusCircle, Upload, Printer, Wallet, Clock
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";

interface Patient { id: string; nom_complet: string; type_assurance: string; }
interface Acte { id: string; nom_acte: string; prix_cash: number; categorie: string; }
interface Sejour { id: string; patient_id: string; patients: Patient; statut: string; created_at: string; }

const PAYMENT_MODES = ["CASH", "ASSURANCE", "MOMO/OM", "CARTE BANCAIRE"];

export default function TresoreriePage() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!authLoading && userRole && !['patron', 'comptable', 'caissier'].includes(userRole)) {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  const [sejours, setSejours] = useState<Sejour[]>([]);
  const [catalogue, setCatalogue] = useState<Acte[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [montantVerse, setMontantVerse] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"caise" | "dettes" | "journal" | "depenses">("caise");
  
  const [journal, setJournal] = useState<any[]>([]);
  const [dettes, setDettes] = useState<any[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<any[]>([]);
  const [isFreeInvoicing, setIsFreeInvoicing] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");
  const [selectedFreePatient, setSelectedFreePatient] = useState<Patient | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);

  // Formulaire de Dépenses
  const [expenseForm, setExpenseForm] = useState({ montant: "", motif: "" });
  
  // Selection states
  const [selectedSejour, setSelectedSejour] = useState<Sejour | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToPay, setDebtToPay] = useState<any | null>(null);
  const [debtAmountInput, setDebtAmountInput] = useState("");
  
  // Reçu state
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Acte[]>([]);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Séjours actifs
      const { data: sejoursData } = await supabase.from('sejours_actifs').select('*, patients(id, nom_complet, type_assurance)').order('created_at', { ascending: false });
      setSejours(sejoursData || []);

      // Transactions en attente
      const { data: pendingData } = await supabase.from('transactions_caisse').select('*, patients(id, nom_complet, type_assurance)').eq('statut_paiement', 'En attente').order('date_transaction', { ascending: false });
      setPendingTransactions(pendingData || []);

      // Catalogue
      const { data: catalogueData } = await supabase.from('actes_catalogue').select('*').order('nom_acte', { ascending: true });
      setCatalogue(catalogueData || []);

      // Dettes (On récupère strictement ceux où reste_a_payer > 0)
      const { data: dettesData } = await supabase.from('transactions_caisse').select('*, patients(id, nom_complet, type_assurance)').gt('reste_a_payer', 0).order('date_transaction', { ascending: false });
      setDettes(dettesData || []);

      // Journal du jour
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: journalData } = await supabase.from('transactions_caisse').select('*, patients(nom_complet)').gte('date_transaction', today.toISOString()).order('date_transaction', { ascending: false });
      setJournal(journalData || []);

      // Patients
      const { data: patientsData } = await supabase.from('patients').select('id, nom_complet, type_assurance').order('nom_complet');
      setAllPatients(patientsData || []);

      // Historique des dépenses
      const { data: expData } = await supabase.from('comptabilite_manuelle').select('*').eq('flux', 'SORTIE').order('created_at', { ascending: false });
      setExpenseHistory(expData || []);
    } catch (err) {
      console.error("Erreur de chargement:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (acte: Acte) => setCart(prev => [...prev, acte]);
  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

  const calculateTotal = () => {
    if (selectedTransaction) return parseFloat(selectedTransaction.montant_total || 0);
    if (!selectedFreePatient && !selectedSejour?.patients) return 0;
    return cart.reduce((acc, item) => acc + (parseFloat(item.prix_cash as any) || 0), 0);
  };

  const soldeEstime = useMemo(() => journal.reduce((acc, tx) => (tx.type_flux === 'Entrée' || !tx.type_flux) ? acc + parseFloat(tx.montant_verse || 0) : acc - parseFloat(tx.montant_total || 0), 0), [journal]);

  // --- SYSTÈME DE DÉCAISSEMENT (SYNCHRONISÉ AVEC LE PATRON) ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.montant || !expenseForm.motif) return toast.error("Remplissez tous les champs.");
    
    setSubmitting(true);
    try {
      const montant = parseFloat(expenseForm.montant);
      // Règle métier : Plus de 30 000 = En attente (Patron) / Sinon = Validé
      const statutDernier = montant > 30000 ? 'En attente' : 'Validé';

      const { error: insertError } = await supabase
        .from('comptabilite_manuelle')
        .insert([{
          montant: montant,
          flux: 'SORTIE',
          description: expenseForm.motif,
          statut: statutDernier
        }]);

      if (insertError) throw insertError;

      if (statutDernier === 'En attente') {
        toast.success("Dépense > 30 000 FCFA. Envoyée au Patron pour approbation ⏳", { duration: 5000 });
      } else {
        toast.success("Décaissement de caisse validé avec succès ✅");
      }
      
      setExpenseForm({ montant: "", motif: "" });
      fetchInitialData();
    } catch (err: any) {
      toast.error(`Erreur d'enregistrement: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- RÈGLEMENT DES DETTES (CORRIGÉ ET BLINDÉ) ---
  const handlePayDebt = async () => {
    if (!debtToPay || !debtAmountInput) return;
    setSubmitting(true);
    try {
      const verse = parseFloat(debtAmountInput);
      const currentVerse = parseFloat(debtToPay.montant_verse || 0);
      const totalAmount = parseFloat(debtToPay.montant_total || 0);

      if (isNaN(verse) || verse <= 0) throw new Error("Montant invalide");

      const newTotalPaid = currentVerse + verse;
      // Le Reste à payer ne peut pas être négatif
      const remains = Math.max(0, totalAmount - newTotalPaid);
      const finalStatut = remains > 0 ? 'Partiel' : 'Payé';

      const { error: updError } = await supabase
        .from('transactions_caisse')
        .update({ 
          montant_verse: newTotalPaid, 
          reste_a_payer: remains, 
          statut_paiement: finalStatut 
        })
        .eq('id', debtToPay.id);
      
      if (updError) throw updError;

      toast.success(remains === 0 ? "Dette totalement soldée ! 🎉" : "Paiement partiel enregistré ✅");
      
      // Génération du reçu de règlement
      setReceiptData({
        id: debtToPay.id,
        type: 'REGLEMENT_DETTE',
        patient: debtToPay.patients?.nom_complet || "Client Externe",
        description: `Règlement de dette: ${debtToPay.description}`,
        total: totalAmount,
        verse_cette_fois: verse,
        total_verse: newTotalPaid,
        reste: remains,
        mode: paymentMode,
        date: new Date()
      });

      setIsDebtModalOpen(false);
      setDebtToPay(null);
      setDebtAmountInput("");
      await fetchInitialData(); // Cela va faire disparaître la dette si reste = 0
    } catch (err: any) {
      toast.error(`Échec du règlement: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- NOUVEL ENCAISSEMENT ---
  const handleValidate = async () => {
    if (!selectedSejour && !selectedTransaction && !selectedFreePatient) return toast.error("Sélectionnez un patient.");
    if (!selectedTransaction && cart.length === 0) return toast.error("Le panier est vide.");

    setSubmitting(true);
    try {
      const total = calculateTotal();
      const verse = montantVerse ? parseFloat(montantVerse) : total;
      const reste = Math.max(0, total - verse);
      const finalStatut = reste > 0 ? (verse > 0 ? 'Partiel' : 'En attente') : 'Payé';
      const description = selectedTransaction ? selectedTransaction.description : cart.map(item => item.nom_acte).join(", ");
      let transactionId = "";
      const effectivePatientId = selectedFreePatient?.id || selectedSejour?.patient_id || selectedTransaction?.patient_id || null;

      if (selectedTransaction) {
        transactionId = selectedTransaction.id;
        const currentVerse = parseFloat(selectedTransaction.montant_verse || 0);

        await supabase.from('transactions_caisse').update({ montant_verse: currentVerse + verse, reste_a_payer: reste, statut_paiement: finalStatut }).eq('id', transactionId);
        if (reste === 0 && selectedTransaction.sejour_id) await supabase.from('sejours_actifs').update({ statut: 'Terminé' }).eq('id', selectedTransaction.sejour_id);
      } else {
        const { data: newTx } = await supabase.from('transactions_caisse').insert([{
          type_flux: 'Entrée', montant_total: total, montant_verse: verse, reste_a_payer: reste,
          description: description, statut_paiement: finalStatut, patient_id: effectivePatientId,
          sejour_id: selectedSejour?.id || null, date_transaction: new Date().toISOString()
        }]).select().single();
        
        if (newTx) transactionId = newTx.id;
        if (reste === 0 && selectedSejour) await supabase.from('sejours_actifs').update({ statut: 'Terminé' }).eq('id', selectedSejour.id);
      }

      toast.success("Transaction enregistrée !");
      
      setReceiptData({
        id: transactionId || "NOUVELLE_TRANS",
        type: 'FACTURE',
        patient: selectedFreePatient?.nom_complet || selectedSejour?.patients?.nom_complet || selectedTransaction?.patients?.nom_complet || "Client Externe",
        description: description,
        total: total,
        verse_cette_fois: verse,
        total_verse: (selectedTransaction ? parseFloat(selectedTransaction.montant_verse || 0) : 0) + verse,
        reste: reste,
        mode: paymentMode,
        date: new Date()
      });

      setCart([]); setMontantVerse(""); setSelectedSejour(null); setSelectedTransaction(null); setSelectedFreePatient(null); setIsFreeInvoicing(false);
      fetchInitialData();
    } catch (err: any) {
      toast.error(`Erreur d'encaissement : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalogue = (catalogue || []).filter(acte => (acte?.nom_acte || "").toLowerCase().includes((searchTerm || "").toLowerCase()));
  
  // Groupement des dettes
  const groupedDettes = useMemo(() => {
    const groups: { [key: string]: { name: string, total: number, items: any[], type: 'PATIENT' | 'ASSURANCE' } } = {};
    dettes.forEach(d => {
      const p = d.patients;
      const hasAssurance = p?.type_assurance && p.type_assurance !== 'Cash';
      const groupKey = hasAssurance ? `ASSURANCE_${p.type_assurance}` : `PATIENT_${p.nom_complet || d.id}`;
      const groupName = hasAssurance ? `Assurance: ${p.type_assurance}` : (p?.nom_complet || "Patient Inconnu");
      
      if (!groups[groupKey]) groups[groupKey] = { name: groupName, total: 0, items: [], type: hasAssurance ? 'ASSURANCE' : 'PATIENT' };
      groups[groupKey].total += parseFloat(d.reste_a_payer || 0);
      groups[groupKey].items.push(d);
    });
    return Object.values(groups).sort((a,b) => b.total - a.total);
  }, [dettes]);

  if (!mounted || loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-riverside-red mx-auto" size={48} /></div>;
  }

  return (
    <>
      <div className={cn("w-full max-w-full overflow-x-hidden space-y-8 pb-20 px-4 md:px-8", receiptData && "print:hidden")}>
        
        {/* --- NAVBAR TRÉSORERIE --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Receipt size={22} /></div>
              Caisse & <span className="text-riverside-red">Trésorerie</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto scrollbar-hide max-w-full">
             {["caise", "depenses", "dettes", "journal"].map((tab) => (
               <button 
                 key={tab} onClick={() => setActiveTab(tab as any)}
                 className={cn("px-4 md:px-5 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                 {tab === "caise" ? "Terminal" : tab === "depenses" ? "Décaissement" : tab}
               </button>
             ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          
          {/* --- ONGLET CAISSE (TERMINAL) --- */}
          {activeTab === "caise" && (
            <motion.div key="caise" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Choix Patient */}
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client & Patient</label>
                    <button onClick={() => { setIsFreeInvoicing(!isFreeInvoicing); setSelectedSejour(null); setSelectedTransaction(null); setSelectedFreePatient(null); setCart([]); }} className={cn("inline-flex w-full sm:w-auto px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all items-center justify-center gap-2", isFreeInvoicing ? "bg-slate-900 text-white" : "bg-emerald-50 text-emerald-600")}>
                       {isFreeInvoicing ? <ArrowLeft size={14} /> : <PlusCircle size={14} />} {isFreeInvoicing ? "Retour File d'attente" : "Facture Libre"}
                    </button>
                  </div>

                  {isFreeInvoicing ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input type="text" placeholder="Rechercher un patient libre..." value={searchPatientTerm} onChange={(e) => setSearchPatientTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red text-sm font-bold uppercase" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
                        {allPatients.filter(p => p.nom_complet.toLowerCase().includes(searchPatientTerm.toLowerCase())).slice(0, 10).map(p => (
                          <button key={p.id} onClick={() => setSelectedFreePatient(p)} className={cn("p-4 rounded-2xl border text-left transition-all", selectedFreePatient?.id === p.id ? "bg-riverside-red border-riverside-red text-white" : "bg-white hover:border-slate-300")}>
                            <p className="text-[10px] font-black uppercase">{p.nom_complet}</p>
                            <p className="text-[8px] mt-1 opacity-70">Régime: {p.type_assurance}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                         {pendingTransactions.map(pt => (
                           <button key={pt.id} onClick={() => { setSelectedTransaction(pt); setSelectedSejour(null); setSelectedFreePatient(null); setCart([]); }} className={cn("p-4 rounded-2xl border text-left transition-all", selectedTransaction?.id === pt.id ? "bg-riverside-red border-riverside-red text-white" : "bg-slate-50 hover:bg-white")}>
                             <p className="text-xs font-black uppercase">{pt.patients?.nom_complet}</p>
                             <p className="text-[10px] opacity-70 mt-1 line-clamp-1">{pt.description}</p>
                             <p className="text-sm font-black mt-2">{(pt.montant_total || 0).toLocaleString()} FCFA</p>
                           </button>
                         ))}
                         {pendingTransactions.length === 0 && <p className="text-xs font-bold text-slate-300">Aucune facture médicale en attente</p>}
                      </div>
                      <select value={selectedSejour?.id || ""} onChange={(e) => { setSelectedSejour(sejours.find(x => x.id === e.target.value) || null); setSelectedTransaction(null); setSelectedFreePatient(null); setCart([]); }} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-riverside-red outline-none text-sm font-bold">
                        <option value="">-- Patient en file d&apos;attente (Consultation) --</option>
                        {sejours.map(s => <option key={s.id} value={s.id}>{s.patients?.nom_complet} ({s.patients?.type_assurance})</option>)}
                      </select>
                    </>
                  )}
                </div>

                {/* Catalogue Actes */}
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col h-[500px]">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Actes & Prestations</label>
                   <div className="relative w-full sm:w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                     <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-riverside-red" />
                   </div>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {filteredCatalogue.map(acte => (
                      <div key={acte.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-riverside-red/30 transition-all">
                          <div>
                            <p className="text-sm font-black text-slate-800">{acte.nom_acte}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{(acte.prix_cash || 0).toLocaleString()} FCFA</p>
                          </div>
                        <button onClick={() => addToCart(acte)} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-riverside-red shadow-md"><Plus size={20} /></button>
                      </div>
                    ))}
                    {filteredCatalogue.length === 0 && <p className="text-center text-slate-400 font-bold text-xs py-10">Aucun acte trouvé</p>}
                  </div>
                </div>
              </div>

              {/* Facture Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-2xl p-6 md:p-8 sticky top-8 flex flex-col min-h-[500px] lg:min-h-[700px]">
                  <div className="mb-4 md:mb-6 grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(mode => (
                      <button key={mode} onClick={() => setPaymentMode(mode)} className={cn("py-2 px-3 rounded-xl border text-[10px] font-black transition-all", paymentMode === mode ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-400 hover:bg-white")}>{mode}</button>
                    ))}
                  </div>

                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] uppercase text-slate-400 font-black">Facturé à :</p>
                    <p className="text-lg font-black text-slate-900">{selectedTransaction?.patients?.nom_complet || selectedSejour?.patients?.nom_complet || selectedFreePatient?.nom_complet || "Aucun Patient"}</p>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                        <div>
                          <p className="text-xs font-black">{item.nom_acte}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">{(item.prix_cash || 0).toLocaleString()} FCFA</p>
                        </div>
                        <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-riverside-red p-2"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-slate-100 pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Net</span>
                      <span className="text-xl font-black">{(calculateTotal() || 0).toLocaleString()} FCFA</span>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase flex justify-between">
                        Montant Versé 
                        <span className="text-riverside-red normal-case italic">Reste: {Math.max(0, calculateTotal() - (montantVerse ? parseFloat(montantVerse) : calculateTotal())).toLocaleString()}</span>
                      </label>
                      <input type="number" placeholder="Laisser vide si paiement total" value={montantVerse} onChange={(e) => setMontantVerse(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-riverside-red font-bold mt-2 text-lg" />
                    </div>

                    <button disabled={submitting || (!selectedTransaction && cart.length === 0)} onClick={handleValidate} className="w-full py-5 bg-slate-950 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl disabled:opacity-50">
                      {submitting ? <Loader2 className="animate-spin" /> : <> <CreditCard size={20} /> ENCAISSER </>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- ONGLET DÉPENSES (DÉCAISSEMENT) --- */}
          {activeTab === "depenses" && (
            <motion.div key="depenses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase mb-2">Décaissement</h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Sortie de fonds de la caisse</p>

                  <form onSubmit={handleSaveExpense} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                       <input required type="number" value={expenseForm.montant} onChange={(e) => setExpenseForm({...expenseForm, montant: e.target.value})} className="w-full px-5 md:px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-black text-lg" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif de la dépense</label>
                       <textarea required rows={4} value={expenseForm.motif} onChange={(e) => setExpenseForm({...expenseForm, motif: e.target.value})} className="w-full px-5 md:px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm resize-none" placeholder="Ex: Achat fournitures..." />
                    </div>
                    <button disabled={submitting} type="submit" className="w-full py-4 md:py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase hover:bg-emerald-700 transition-all shadow-xl flex justify-center items-center gap-3">
                       {submitting ? <Loader2 className="animate-spin" size={20} /> : <Wallet size={20} />} SOUMETTRE
                    </button>
                  </form>
               </div>

               <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
                  <ShieldCheck className="absolute bottom-0 right-0 text-white/5 -mb-6 -mr-6" size={180} />
                  <div className="relative z-10">
                     <p className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Règle de sécurité</p>
                     <h4 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-8">Contrôle<br/>des flux</h4>
                     <ul className="space-y-6">
                        <li className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"><CheckCircle size={16} /></div>
                           <p className="text-[12px] md:text-sm font-bold text-slate-300"><span className="text-white">Moins de 30 000 FCFA :</span> Validée automatiquement.</p>
                        </li>
                        <li className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0"><Clock size={16} /></div>
                           <p className="text-[12px] md:text-sm font-bold text-slate-300"><span className="text-white">Plus de 30 000 FCFA :</span> Mise en attente (Patron).</p>
                        </li>
                     </ul>
                  </div>
               </div>

               {/* Historique des décaissements */}
               <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden mt-8">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Dernières Sorties de Caisse</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-[10px] uppercase text-slate-400 font-black">Date</th>
                          <th className="p-4 text-[10px] uppercase text-slate-400 font-black">Motif</th>
                          <th className="p-4 text-[10px] uppercase text-slate-400 font-black">Montant</th>
                          <th className="p-4 text-[10px] uppercase text-slate-400 font-black">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expenseHistory.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-xs uppercase">Aucun décaissement enregistré</td></tr>
                        ) : (
                          expenseHistory.slice(0, 5).map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-bold text-slate-400">{new Date(exp.created_at || exp.date_operation).toLocaleDateString()}</td>
                              <td className="p-4 font-black uppercase text-xs">{exp.description}</td>
                              <td className="p-4 font-black text-riverside-red">{(exp.montant || 0).toLocaleString()} FCFA</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                  exp.statut === 'Validé' || exp.statut === 'Approuvé' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                )}>
                                  {exp.statut}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}

          {/* --- ONGLET DETTES (RECOUVREMENT) --- */}
          {activeTab === "dettes" && (
            <motion.div key="dettes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-6 md:p-12">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Suivi du Recouvrement</h3>
                 <p className="text-lg md:text-xl font-black text-riverside-red">{(dettes.reduce((acc, curr) => acc + (parseFloat(curr?.reste_a_payer) || 0), 0) || 0).toLocaleString()} FCFA</p>
               </div>
               
               <div className="space-y-4">
                 {groupedDettes.length === 0 ? (
                   <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">Aucune dette en cours</p>
                 ) : (
                   groupedDettes.map((group) => (
                     <details key={group.name} className="group bg-slate-50 rounded-2xl p-4 md:p-6 open:bg-white open:shadow-lg transition-all border border-slate-100">
                       <summary className="font-black text-slate-900 flex justify-between items-center cursor-pointer list-none">
                         <div className="flex items-center gap-3">
                           <div className={cn("w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-white", group.type === 'ASSURANCE' ? "bg-riverside-red" : "bg-slate-900")}>
                             {group.type === 'ASSURANCE' ? <ShieldCheck size={14} className="md:size-[16px]" /> : <User size={14} className="md:size-[16px]" />}
                           </div>
                           <span className="text-xs md:text-base">{group.name} <span className="hidden sm:inline text-[8px] md:text-[10px] text-slate-400 font-bold bg-slate-200 px-2 py-1 rounded-md ml-2">{group.items.length} factures</span></span>
                         </div>
                         <span className="text-riverside-red text-sm md:text-lg">{(group.total || 0).toLocaleString()} <span className="text-[8px] md:text-[10px]">FCFA</span></span>
                       </summary>
                       <div className="pt-6 space-y-4">
                         {group.items.map(item => (
                           <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                             <div>
                               <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-800">{item.description}</p>
                               <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase mt-1">Initial: {(parseFloat(item.montant_total)).toLocaleString()} • Déjà versé: {(parseFloat(item.montant_verse)).toLocaleString()}</p>
                             </div>
                             <div className="flex items-center justify-between sm:justify-end gap-4">
                               <p className="text-xs md:text-sm font-black text-riverside-red">Reste: {(parseFloat(item.reste_a_payer) || 0).toLocaleString()} <span className="text-[8px]">FCFA</span></p>
                               <button onClick={(e) => { e.stopPropagation(); setDebtToPay(item); setDebtAmountInput(item.reste_a_payer.toString()); setIsDebtModalOpen(true); }} className="bg-slate-900 hover:bg-riverside-red text-white text-[8px] md:text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all">Régler</button>
                             </div>
                           </div>
                         ))}
                       </div>
                     </details>
                   ))
                 )}
               </div>
            </motion.div>
          )}

          {/* --- ONGLET JOURNAL --- */}
          {activeTab === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8">
              <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Journal des Ventes du Jour</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-[10px] uppercase text-slate-400 font-black">Heure</th><th className="p-4 text-[10px] uppercase text-slate-400 font-black">Patient</th><th className="p-4 text-[10px] uppercase text-slate-400 font-black">Total Facturé</th><th className="p-4 text-[10px] uppercase text-slate-400 font-black">Perçu (Caisse)</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                  {journal.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-xs uppercase">Aucune transaction aujourd&apos;hui</td></tr> : journal.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setReceiptData({ id: tx.id, type: 'DUPLICATA', patient: tx.patients?.nom_complet, description: tx.description, total: tx.montant_total, verse_cette_fois: tx.montant_verse, total_verse: tx.montant_verse, reste: tx.reste_a_payer, mode: tx.mode_paiement || "N/A", date: tx.date_transaction })}>
                      <td className="p-4 font-bold text-slate-400">{new Date(tx.date_transaction).toLocaleTimeString()}</td>
                      <td className="p-4 font-black uppercase">{tx.patients?.nom_complet || "Inconnu"}</td>
                      <td className="p-4 font-black">{(parseFloat(tx.montant_total) || 0).toLocaleString()}</td>
                      <td className="p-4 font-black text-emerald-500">{(parseFloat(tx.montant_verse) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-4 text-center">Cliquez sur une ligne pour réimprimer son reçu.</p>
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODAL PAIEMENT DETTE --- */}
      {isDebtModalOpen && debtToPay && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-100">
            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Règlement de Dette</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mb-6">{debtToPay.patients?.nom_complet}</p>
            
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-6 flex justify-between items-center">
               <span className="text-[10px] font-black uppercase text-riverside-red">Reste à payer</span>
               <span className="text-lg font-black text-riverside-red">{(parseFloat(debtToPay?.reste_a_payer) || 0).toLocaleString()} FCFA</span>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Mode de paiement</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs mt-1 outline-none focus:border-riverside-red">
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Montant versé par le client</label>
                <input type="number" value={debtAmountInput} onChange={(e) => setDebtAmountInput(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black mt-1 outline-none focus:border-riverside-red" autoFocus />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsDebtModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl text-xs uppercase hover:bg-slate-200 transition-all">Annuler</button>
              <button disabled={submitting} onClick={handlePayDebt} className="flex-1 py-4 bg-riverside-red text-white font-black rounded-xl text-xs uppercase flex justify-center items-center shadow-lg hover:bg-red-700 transition-all disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- REÇU IMPRIMABLE EN PLEIN ÉCRAN --- */}
      {receiptData && (
        <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col items-center overflow-y-auto">
          <div className="w-full bg-slate-900 text-white p-4 flex justify-between items-center print:hidden sticky top-0 z-10 shadow-lg">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"><CheckCircle size={16} /> Transaction validée</p>
            <div className="flex gap-4">
              <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Printer size={16} /> Imprimer Ticket</button>
              <button onClick={() => setReceiptData(null)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2"><X size={16} /> Fermer</button>
            </div>
          </div>

          <div className="bg-white w-full max-w-[80mm] md:max-w-md min-h-[500px] mt-8 mb-8 p-6 shadow-2xl print:shadow-none print:m-0 print:p-4 print:w-full font-mono text-slate-900 text-xs">
            <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
              <h2 className="text-lg font-black uppercase leading-none mb-1">RIVERSIDE</h2>
              <p className="text-[10px] font-bold uppercase">Medical Center</p>
              <p className="text-[9px] mt-2 opacity-60">Douala, Cameroun</p>
            </div>

            <div className="space-y-1 mb-4 text-[10px] border-b border-dashed border-slate-300 pb-4">
              <p className="flex justify-between"><span>Date:</span> <span className="font-bold">{new Date(receiptData.date).toLocaleString()}</span></p>
              <p className="flex justify-between"><span>Ref Trans:</span> <span className="font-bold">{receiptData.id.slice(0, 8).toUpperCase()}</span></p>
              <p className="flex justify-between"><span>Patient:</span> <span className="font-bold">{receiptData.patient}</span></p>
              <p className="flex justify-between"><span>Opérateur:</span> <span className="font-bold">Caisse / {userRole || "Admin"}</span></p>
            </div>

            <div className="mb-4">
              <p className="font-black border-b border-slate-900 pb-1 mb-2 uppercase text-[10px]">Désignation</p>
              <p className="text-[10px] font-bold leading-relaxed">{receiptData.description}</p>
            </div>

            <div className="border-t border-slate-900 pt-2 space-y-1 text-[11px] mb-6">
              <p className="flex justify-between items-center"><span>Total Net:</span> <span className="font-black text-sm">{(receiptData.total || 0).toLocaleString()} FCFA</span></p>
              <p className="flex justify-between items-center text-slate-500"><span>Déjà réglé / Reste:</span> <span>{Math.max(0, receiptData.total_verse - receiptData.verse_cette_fois).toLocaleString()} / {(receiptData.reste || 0).toLocaleString()}</span></p>
              <p className="flex justify-between items-center mt-2 border-t border-dashed border-slate-300 pt-2">
                <span className="font-black uppercase">PAYÉ CE JOUR:</span> 
                <span className="font-black text-base">{(receiptData.verse_cette_fois || 0).toLocaleString()} FCFA</span>
              </p>
              <p className="flex justify-between items-center mt-1"><span className="opacity-60 text-[9px]">Mode:</span> <span className="font-bold">{receiptData.mode}</span></p>
            </div>

            <div className="text-center text-[9px] opacity-60 mt-12 font-bold uppercase">
              <p>Merci de votre confiance.</p>
              <p>Riverside ERP - Propulsé par DOULIA</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
