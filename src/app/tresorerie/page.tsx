"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Receipt, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  CreditCard, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  FileText,
  ShoppingBag,
  ShieldCheck,
  Activity,
  ArrowLeft,
  PlusCircle,
  Upload,
  Printer,
  ChevronRight,
  Wallet
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface Patient {
  id: string;
  nom_complet: string;
  type_assurance: string;
}

interface Acte {
  id: string;
  nom_acte: string;
  prix_cash: number;
  base_assurance: number;
  categorie: string;
}

interface Sejour {
  id: string;
  patient_id: string;
  patients: Patient;
  statut: string;
  created_at: string;
}

// Payment Methods Constants
const PAYMENT_MODES = ["CASH", "ASSURANCE", "MOMO/OM", "CARTE BANCAIRE"];

export default function TresoreriePage() {
  const [sejours, setSejours] = useState<Sejour[]>([]);
  const [catalogue, setCatalogue] = useState<Acte[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [montantVerse, setMontantVerse] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"caise" | "dettes" | "journal" | "depenses">("caise");
  const [recouvrementTab, setRecouvrementTab] = useState<"patients" | "assurances">("patients");
  const [journal, setJournal] = useState<any[]>([]);
  const [dettes, setDettes] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");

  const [isFreeInvoicing, setIsFreeInvoicing] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");
  const [selectedFreePatient, setSelectedFreePatient] = useState<Patient | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);

  // Expenses States
  const [beneficiaires, setBeneficiaires] = useState<any[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    beneficiaire_id: "",
    montant: "",
    motif: "",
    file: null as File | null
  });
  
  // Selection states
  const [selectedSejour, setSelectedSejour] = useState<Sejour | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Acte[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les séjours actifs (File d'attente)
      const { data: sejoursData, error: sejoursError } = await supabase
        .from('sejours_actifs')
        .select('*, patients(id, nom_complet, type_assurance)')
        .order('created_at', { ascending: false });

      if (sejoursError) throw sejoursError;
      setSejours(sejoursData || []);

      // 1b. Récupérer les transactions en attente (Liaison Médicale)
      const { data: pendingData } = await supabase
        .from('transactions_caisse')
        .select(`
          *,
          patients (
            id,
            nom_complet,
            type_assurance
          )
        `)
        .eq('statut_paiement', 'En attente')
        .order('date_transaction', { ascending: false });
      
      setPendingTransactions(pendingData || []);

      // 2. Récupérer le catalogue des actes
      const { data: catalogueData, error: catalogueError } = await supabase
        .from('actes_catalogue')
        .select('*')
        .order('nom_acte', { ascending: true });

      if (catalogueError) throw catalogueError;
      setCatalogue(catalogueData || []);

      // 3. Récupérer les dettes
      const { data: dettesData, error: dettesError } = await supabase
        .from('transactions_caisse')
        .select('*, patients(nom_complet, type_assurance)')
        .gt('reste_a_payer', 0)
        .order('date_transaction', { ascending: false });
      
      if (dettesError) console.error("Erreur dettes:", dettesError);
      else setDettes(dettesData || []);

      // 4. Récupérer le journal du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: journalData } = await supabase
        .from('transactions_caisse')
        .select('*, patients(nom_complet)')
        .gte('date_transaction', today.toISOString())
        .order('date_transaction', { ascending: false });
      setJournal(journalData || []);

      // 5. Récupérer TOUS les patients (pour facture libre)
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, nom_complet, type_assurance')
        .order('nom_complet');
      setAllPatients(patientsData || []);

      // 6. Récupérer les bénéficiaires pour dépenses
      const { data: bData } = await supabase
        .from('liste_beneficiaires')
        .select('*')
        .order('nom');
      setBeneficiaires(bData || []);

    } catch (err) {
      console.error("[Treasury] Erreur de chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (acte: Acte) => {
    setCart(prev => [...prev, acte]);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    if (selectedTransaction) return selectedTransaction.montant_total;
    
    // Determine which patient info to use
    const patientInfo = selectedFreePatient || selectedSejour?.patients;
    if (!patientInfo) return 0;

    const isCashOnly = patientInfo.type_assurance === "Cash";
    
    const total = cart.reduce((acc, item) => {
      return acc + (isCashOnly ? item.prix_cash : item.base_assurance);
    }, 0);

    return total;
  };

  const handleValidate = async () => {
    if (!selectedSejour && !selectedTransaction && !selectedFreePatient) {
      toast.error("Veuillez sélectionner un patient ou une transaction.");
      return;
    }
    
    if (!selectedTransaction && cart.length === 0) {
      toast.error("Le panier est vide.");
      return;
    }

    setSubmitting(true);
    try {
      const total = calculateTotal();
      // Facturation logic: si vide, on considère payé totalement.
      const verse = montantVerse ? parseFloat(montantVerse) : total;
      
      // CRITICAL LOGIC: reste_a_payer = total - verse
      const reste = Math.max(0, total - verse);
      
      // Status update logic
      let finalStatut = 'Payé';
      if (reste > 0) {
        finalStatut = verse > 0 ? 'Partiel' : 'En attente';
      }

      const description = selectedTransaction 
        ? selectedTransaction.description 
        : cart.map(item => item.nom_acte).join(", ");

      console.log(`Flux Trésorerie - Validation Paiement: Total=${total}, Versé=${verse}, Reste=${reste}`);

      let transactionId = "";

      if (selectedTransaction) {
        transactionId = selectedTransaction.id;
        const { error: txUpdError } = await supabase
          .from('transactions_caisse')
          .update({
            montant_verse: (selectedTransaction.montant_verse || 0) + verse,
            reste_a_payer: reste,
            statut_paiement: finalStatut
          })
          .eq('id', transactionId);
        if (txUpdError) throw txUpdError;

        if (reste === 0 && selectedTransaction.sejour_id) {
          await supabase
            .from('sejours_actifs')
            .update({ statut: 'Terminé' })
            .eq('id', selectedTransaction.sejour_id);
        }
      } else {
        const effectivePatientId = selectedFreePatient?.id || selectedSejour?.patient_id;
        const { data: newTx, error: txError } = await supabase
          .from('transactions_caisse')
          .insert([{
            type_flux: 'Entrée',
            montant_total: total,
            montant_verse: verse,
            reste_a_payer: reste,
            description: `Facture [${paymentMode}] - Actes: ${description}`,
            statut_paiement: finalStatut,
            patient_id: effectivePatientId,
            sejour_id: selectedSejour?.id || null,
            date_transaction: new Date().toISOString()
          }])
          .select()
          .single();
        if (txError) throw txError;
        if (newTx) transactionId = newTx.id;

        if (reste === 0 && selectedSejour) {
          await supabase
            .from('sejours_actifs')
            .update({ statut: 'Terminé' })
            .eq('id', selectedSejour.id);
        }
      }

      // Historique des paiements
      if (verse > 0) {
        await supabase.from('historique_paiements').insert([{
          transaction_id: transactionId,
          montant_paye: verse,
          mode_paiement: paymentMode,
          date_paiement: new Date().toISOString()
        }]);
      }

      setSuccess(true);
      toast.success("Transaction enregistrée avec succès");
      
      setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setMontantVerse("");
        setSelectedSejour(null);
        setSelectedTransaction(null);
        setSelectedFreePatient(null);
        setIsFreeInvoicing(false);
        fetchInitialData();
      }, 2000);

    } catch (err: any) {
      console.error("Flux Trésorerie - ERREUR:", err);
      toast.error(`Erreur d'encaissement : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.beneficiaire_id || !expenseForm.montant || !expenseForm.motif) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = "";
      if (expenseForm.file) {
        const fileExt = expenseForm.file.name.split('.').pop();
        const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('justificatifs')
          .upload(fileName, expenseForm.file);
        
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('justificatifs').getPublicUrl(fileName);
        fileUrl = publicUrlData.publicUrl;
      }

      const montant = parseFloat(expenseForm.montant);
      const isAutoApproved = montant <= 30000;

      const { error: insertError } = await supabase
        .from('depenses_caisse')
        .insert([{
          beneficiaire_id: expenseForm.beneficiaire_id,
          montant: montant,
          motif: expenseForm.motif,
          piece_jointe_url: fileUrl,
          statut_validation: isAutoApproved ? 'Approuvé' : 'En attente',
          date_depense: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      if (isAutoApproved) {
        toast.success("Dépense enregistrée et approuvée automatiquement.");
      } else {
        toast("Soumis à l'approbation de la direction (Montant > 30.000)", {
          icon: '⚠️',
          style: {
            borderRadius: '16px',
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fef3c7',
            fontWeight: 'bold',
            fontSize: '12px'
          },
        });
      }

      setExpenseForm({ beneficiaire_id: "", montant: "", motif: "", file: null });
      fetchInitialData();
    } catch (err: any) {
      toast.error(`Erreur d'enregistrement: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedDettes = useMemo(() => {
    const groups: { [key: string]: { name: string, total: number, items: any[], type: 'PATIENT' | 'ASSURANCE' } } = {};
    dettes.forEach(d => {
      const p = d.patients;
      const hasAssurance = p?.type_assurance && p.type_assurance !== 'Cash';
      
      const groupKey = hasAssurance ? `ASSURANCE_${p.type_assurance}` : `PATIENT_${p.nom_complet || d.id}`;
      const groupName = hasAssurance ? `Remboursement: ${p.type_assurance}` : (p?.nom_complet || "Patient Inconnu");

      if (!groups[groupKey]) {
        groups[groupKey] = { 
          name: groupName, 
          total: 0, 
          items: [], 
          type: hasAssurance ? 'ASSURANCE' : 'PATIENT' 
        };
      }
      groups[groupKey].total += d.reste_a_payer;
      groups[groupKey].items.push(d);
    });
    return Object.values(groups).sort((a,b) => b.total - a.total);
  }, [dettes]);

  const filteredCatalogue = (catalogue || []).filter(acte => 
    (acte?.nom_acte || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-riverside-red mx-auto" size={48} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Initialisation de la caisse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-8 pb-20 px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Receipt size={22} />
            </div>
            Caisse & <span className="text-riverside-red">Facturation</span>
          </h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Gestion des Revenus & Flux Financiers</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100 flex-wrap">
           <button 
            onClick={() => setActiveTab("caise")}
            className={cn(
              "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              activeTab === "caise" ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
            )}
           >
             Terminal
           </button>
           <button 
            onClick={() => setActiveTab("journal")}
            className={cn(
              "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              activeTab === "journal" ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
           >
             Journal
           </button>
           <button 
            onClick={() => setActiveTab("depenses")}
            className={cn(
              "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              activeTab === "depenses" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
           >
             Dépenses
           </button>
           <button 
            onClick={() => setActiveTab("dettes")}
            className={cn(
              "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              activeTab === "dettes" ? "bg-riverside-red text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
           >
             Recouvrement
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "caise" ? (
          <motion.div 
            key="caise" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
        
        {/* Colonne Gauche: Saisie */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sélection du Patient */}
            <motion.div 
              whileHover={{ boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
              className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-6">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En attente de paiement (Médical)</label>
                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => {
                      setIsFreeInvoicing(!isFreeInvoicing);
                      setSelectedSejour(null);
                      setSelectedTransaction(null);
                      setSelectedFreePatient(null);
                      setCart([]);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      isFreeInvoicing ? "bg-slate-900 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                   >
                     {isFreeInvoicing ? <ArrowLeft size={14} /> : <PlusCircle size={14} />}
                     {isFreeInvoicing ? "Retour Process Standard" : "Nouvelle Facture Libre"}
                   </button>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-riverside-red rounded-full animate-pulse" />
                      <span className="text-[10px] text-riverside-red font-black uppercase">{pendingTransactions.length} FACTURES</span>
                   </div>
                </div>
              </div>

              {isFreeInvoicing ? (
                <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-6 bg-slate-900 rounded-3xl text-white">
                    <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-3">
                      <User className="text-riverside-red" /> 
                      Sélection Patient (Externe / Ambulatoire)
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Recherchez un patient dans la base de données globale</p>
                    
                    <div className="mt-4 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        type="text"
                        placeholder="RECHERCHER UN PATIENT PAR NOM..."
                        value={searchPatientTerm}
                        onChange={(e) => setSearchPatientTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-riverside-red transition-all font-bold text-sm uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {allPatients
                      .filter(p => p.nom_complet.toLowerCase().includes(searchPatientTerm.toLowerCase()))
                      .slice(0, 12)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedFreePatient(p)}
                          className={cn(
                            "p-5 rounded-2xl border text-left transition-all group",
                            selectedFreePatient?.id === p.id 
                              ? "bg-riverside-red border-riverside-red text-white shadow-xl" 
                              : "bg-white border-slate-100 hover:border-slate-300"
                          )}
                        >
                          <p className="text-[10px] font-black uppercase group-hover:tracking-wider transition-all">{p.nom_complet}</p>
                          <p className="text-[8px] font-bold opacity-60 mt-1 uppercase">Régime: {p.type_assurance}</p>
                        </button>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                     {pendingTransactions.map(pt => (
                       <button
                        key={pt.id}
                        onClick={() => {
                          setSelectedTransaction(pt);
                          setSelectedSejour(null);
                          setSelectedFreePatient(null);
                          setCart([]);
                        }}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all",
                          selectedTransaction?.id === pt.id 
                            ? "bg-riverside-red border-riverside-red text-white shadow-lg" 
                            : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-300"
                        )}
                       >
                         <p className="text-xs font-black uppercase">{pt.patients?.nom_complet}</p>
                         <p className="text-[8px] font-bold opacity-60 mt-1">{pt.description}</p>
                         <p className="text-sm font-black mt-2">{pt.montant_total.toLocaleString()} FCFA</p>
                       </button>
                     ))}
                     {pendingTransactions.length === 0 && (
                       <p className="col-span-2 text-[10px] font-bold text-slate-300 uppercase py-4">Aucune facture médicale en attente</p>
                     )}
                  </div>

                  <div className="flex items-center justify-between mb-6 pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saisie Manuelle (File d&apos;attente)</label>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 font-black">{sejours.length} EN ATTENTE</span>
                  </div>
                  <select 
                    value={selectedSejour?.id || ""}
                    onChange={(e) => {
                      const s = sejours.find(x => x.id === e.target.value);
                      setSelectedSejour(s || null);
                      setSelectedTransaction(null);
                      setSelectedFreePatient(null);
                      setCart([]);
                    }}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-riverside-red/20 focus:border-riverside-red outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="">-- Choisir un patient dans la file d&apos;attente --</option>
                    {sejours.length === 0 && <option disabled>Aucun patient en attente</option>}
                    {sejours.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.patients?.nom_complet || 'Sans nom'} - ({s.patients?.type_assurance || 'Cash'})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </motion.div>

            {/* Catalogue / Recherche */}
            <motion.div 
              whileHover={{ boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
              className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col h-[600px] transition-all duration-500"
            >
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Actes & Prestations</label>
               <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  type="text" 
                  placeholder="Rechercher un acte (ex: Consultation, Radio...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-riverside-red transition-all"
                 />
               </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {filteredCatalogue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                    <Search size={48} />
                    <p className="text-sm font-bold uppercase tracking-widest">Aucun acte trouvé</p>
                  </div>
                ) : (
                  filteredCatalogue.map(acte => (
                    <div 
                      key={acte.id}
                      className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-riverside-red/30 hover:shadow-lg hover:shadow-slate-100 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-riverside-red transition-colors">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none">{acte.nom_acte}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{acte.prix_cash.toLocaleString()} FCFA (CASH)</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => addToCart(acte)}
                        className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-riverside-red transition-all shadow-lg active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
          </motion.div>
        </div>

        {/* Colonne Droite: Facture */}
        <motion.div 
          whileHover={{ boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
          className="lg:col-span-4 space-y-6 transition-all duration-500"
        >
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[700px] sticky top-8">
            
            <div className="bg-slate-950 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-riverside-red/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <FileText className="text-riverside-red" />
                FACTURE <span className="text-slate-400">#RMC-{new Date().getFullYear()}</span>
              </h3>
              <p className="text-[9px] text-slate-500 font-black tracking-[0.2em] uppercase mt-2">Document Interne • Riverside</p>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              
              {/* Mode de Paiement Selection */}
              <div className="mb-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Mode de Paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-[10px] font-black transition-all",
                        paymentMode === mode 
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTransaction || selectedSejour || selectedFreePatient ? (
                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Client</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                      (selectedTransaction?.patients?.type_assurance || selectedSejour?.patients?.type_assurance || selectedFreePatient?.type_assurance) === "Cash" ? "bg-amber-100 text-amber-600" : "bg-blue-600 text-white"
                    )}>
                      {selectedTransaction?.patients?.type_assurance || selectedSejour?.patients?.type_assurance || selectedFreePatient?.type_assurance || 'Privé'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedTransaction?.patients?.nom_complet || selectedSejour?.patients?.nom_complet || selectedFreePatient?.nom_complet}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Ref: {selectedTransaction?.id?.slice(0, 8) || selectedSejour?.id?.slice(0, 8) || selectedFreePatient?.id?.slice(0, 8)}</p>
                </div>
              ) : (
                <div className="mb-8 p-10 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center bg-slate-50/50">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm mb-4">
                     <User size={24} />
                   </div>
                   <p className="text-xs text-slate-400 font-black uppercase tracking-widest italic leading-relaxed">En attente de<br/>sélection patient</p>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Désignation</p>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Montant</p>
                </div>
                
                {cart.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center opacity-20">
                    <ShoppingBag size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Facture vierge</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between group animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 pr-4">
                          <p className="text-xs font-black text-slate-800 leading-tight group-hover:text-riverside-red transition-colors">{item.nom_acte}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{item.categorie}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <p className="text-sm font-black text-slate-900 tabular-nums">
                            {(selectedSejour?.patients?.type_assurance === "Cash" ? item.prix_cash : item.base_assurance).toLocaleString()}
                          </p>
                          <button 
                            onClick={() => removeFromCart(idx)}
                            className="text-slate-300 hover:text-riverside-red transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="mt-8 pt-8 border-t-2 border-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Brut</span>
                  <span className="text-xs font-black text-slate-800 tabular-nums">{calculateTotal().toLocaleString()} FCFA</span>
                </div>

                <div className="flex items-center justify-between text-riverside-red">
                  <span className="text-[10px] font-black uppercase tracking-widest">Reste à Payer</span>
                  <span className="text-xs font-black tabular-nums">
                    {Math.max(0, calculateTotal() - (montantVerse ? parseFloat(montantVerse) : calculateTotal())).toLocaleString()} FCFA
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    Montant Versé (FCFA)
                    <span className="text-riverside-red italic lowercase">Laissez vide si paiement total</span>
                  </label>
                  <input 
                    type="number"
                    placeholder="Saisir le montant perçu..."
                    value={montantVerse}
                    onChange={(e) => setMontantVerse(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red transition-all font-mono font-bold text-sm"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    Consommation Stock (Opt.)
                    <span className="text-slate-400 italic lowercase">Déduction auto</span>
                  </label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-riverside-red text-[10px] font-bold"
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                  >
                    <option value="">-- Aucun article --</option>
                    {stocks.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.designation} ({s.quantite_actuelle} restants)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="p-6 bg-riverside-red text-white rounded-3xl flex items-center justify-between shadow-xl shadow-red-100 ring-4 ring-red-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Net à Payer</span>
                    <span className="text-8px font-bold italic opacity-60">Moyen de paiement: {paymentMode}</span>
                  </div>
                  <span className="text-2xl font-black tabular-nums">{calculateTotal().toLocaleString()}</span>
                </div>

                <button 
                  disabled={submitting || (!selectedTransaction && (!selectedSejour || cart.length === 0))}
                  onClick={handleValidate}
                  className="w-full py-5 bg-slate-950 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:opacity-30 shadow-2xl flex items-center justify-center gap-3 mt-6"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <CreditCard size={20} />
                      VALIDER L&apos;ENCAISSEMENT
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
        ) : activeTab === "depenses" ? (
          <motion.div 
            key="depenses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-12">
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl flex flex-col md:flex-row gap-12">
                  <div className="flex-1 space-y-8">
                     <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Saisie d&apos;un Décaissement</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestion des dépenses & justificatifs</p>
                     </div>

                     <form onSubmit={handleSaveExpense} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bénéficiaire</label>
                             <select 
                               required
                               value={expenseForm.beneficiaire_id}
                               onChange={(e) => setExpenseForm({...expenseForm, beneficiaire_id: e.target.value})}
                               className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm appearance-none transition-all"
                             >
                                <option value="">Choisir un bénéficiaire...</option>
                                {beneficiaires.map(b => (
                                  <option key={b.id} value={b.id}>{b.nom}</option>
                                ))}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                             <input 
                               required
                               type="number"
                               placeholder="0.00"
                               value={expenseForm.montant}
                               onChange={(e) => setExpenseForm({...expenseForm, montant: e.target.value})}
                               className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-mono font-bold text-sm transition-all"
                             />
                          </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motif du décaissement</label>
                           <textarea 
                             required
                             rows={4}
                             value={expenseForm.motif}
                             onChange={(e) => setExpenseForm({...expenseForm, motif: e.target.value})}
                             placeholder="Détaillez la raison de cette dépense..."
                             className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm transition-all resize-none"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pièce Justificative (Optimisé AI)</label>
                           <div className="relative group">
                              <input 
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setExpenseForm({...expenseForm, file: e.target.files ? e.target.files[0] : null})}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full px-6 py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-3 group-hover:bg-slate-100 group-hover:border-emerald-200 transition-all">
                                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                                    <Upload size={20} />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-900 uppercase">
                                       {expenseForm.file ? expenseForm.file.name : "Cliquez ou glissez le justificatif"}
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <button 
                          disabled={submitting}
                          type="submit"
                          className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                        >
                           {submitting ? <Loader2 className="animate-spin" size={20} /> : <Wallet size={20} />}
                           ENREGISTRER LE DÉCAISSEMENT
                        </button>
                     </form>
                  </div>

                  <div className="w-full md:w-80 space-y-6">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                       <div className="relative z-10">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Workflow Riverside</p>
                          <h4 className="text-lg font-black tracking-tight leading-tight mb-6">Contrôle de<br/><span className="text-emerald-400">Flux de Caisse</span></h4>
                          
                          <div className="space-y-4">
                             <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                                <p className="text-[10px] font-bold text-slate-300">Montant ≤ 30k: Validation Automatique.</p>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                                <p className="text-[10px] font-bold text-slate-300">Montant &gt; 30k: Soumis à validation Direction.</p>
                             </div>
                             <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full mt-1.5 shrink-0" />
                                <p className="text-[10px] font-bold text-slate-300">Archivage automatique des justificatifs.</p>
                             </div>
                          </div>
                       </div>
                       <ShieldCheck className="absolute bottom-0 right-0 text-white/5 -mb-6 -mr-6" size={140} />
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8">
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Solde de Caisse (Estimé)</p>
                       <p className="text-2xl font-black text-emerald-900 tabular-nums">482.500 <span className="text-sm">FCFA</span></p>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : activeTab === "journal" ? (
          <motion.div 
            key="journal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Journal des Ventes du Jour</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Récapitulatif des transactions encaissées aujourd&apos;hui</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Journalier</p>
                  <p className="text-xl font-black text-slate-900">{journal.reduce((a, b) => a + (b.montant_total || 0), 0).toLocaleString()} FCFA</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Encaisse Réelle</p>
                  <p className="text-xl font-black text-emerald-500">{journal.reduce((a, b) => a + (b.montant_verse || 0), 0).toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Heure</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Patient</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Désignation</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Perçu</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {journal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-xs">Aucune transaction enregistrée aujourd&apos;hui</td>
                    </tr>
                  ) : (
                    journal.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-[11px] font-mono font-bold text-slate-400">
                          {new Date(tx.date_transaction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{tx.patients?.nom_complet || "Patient Externe"}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">ID: {tx.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-bold text-slate-600 line-clamp-1 max-w-xs">{tx.description}</p>
                        </td>
                        <td className="px-8 py-5 text-right text-xs font-black text-slate-900 tabular-nums">
                          {tx.montant_total.toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-right text-xs font-black text-emerald-500 tabular-nums">
                          {tx.montant_verse.toLocaleString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={cn(
                            "text-xs font-black tabular-nums",
                            tx.reste_a_payer > 0 ? "text-riverside-red" : "text-slate-300"
                          )}>
                            {tx.reste_a_payer.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dettes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-12"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Suivi du Recouvrement</h3>
                <div className="flex items-center gap-4 mt-2">
                   <button 
                    onClick={() => setRecouvrementTab("patients")}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-all pb-1 border-b-2",
                      recouvrementTab === "patients" ? "text-riverside-red border-riverside-red" : "text-slate-300 border-transparent hover:text-slate-500"
                    )}
                   >
                     Dettes Patients
                   </button>
                   <button 
                    onClick={() => setRecouvrementTab("assurances")}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-all pb-1 border-b-2",
                      recouvrementTab === "assurances" ? "text-riverside-red border-riverside-red" : "text-slate-300 border-transparent hover:text-slate-500"
                    )}
                   >
                     Créances Assurances
                   </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Encours Global</p>
                <p className="text-3xl font-black text-riverside-red">{dettes.reduce((acc, curr) => acc + curr.reste_a_payer, 0).toLocaleString()} FCFA</p>
              </div>
            </div>

            <div className="space-y-4">
              {groupedDettes.filter(g => recouvrementTab === "patients" ? g.type === 'PATIENT' : g.type === 'ASSURANCE').length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest bg-slate-50 rounded-3xl">Aucun reste à payer pour cette catégorie</div>
              ) : (
                groupedDettes
                  .filter(g => recouvrementTab === "patients" ? g.type === 'PATIENT' : g.type === 'ASSURANCE')
                  .map((group, idx) => (
                  <details 
                    key={group.name}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 open:shadow-md"
                  >
                    <summary className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors list-none">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                          group.type === 'ASSURANCE' ? "bg-riverside-red shadow-lg shadow-red-100" : "bg-slate-900"
                        )}>
                          {group.type === 'ASSURANCE' ? <ShieldCheck size={20} /> : <User size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{group.name}</h4>
                             {group.type === 'ASSURANCE' && <span className="bg-red-50 text-riverside-red text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-red-100">Stratégique</span>}
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{group.items.length} facture(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Solde</p>
                          <p className="text-sm font-black text-riverside-red tabular-nums">{group.total.toLocaleString()} FCFA</p>
                        </div>
                        <Plus className="text-slate-300 group-open:rotate-45 transition-transform" size={16} />
                      </div>
                    </summary>
                    
                    <div className="p-6 pt-0 border-t border-slate-50 space-y-4 bg-slate-50/30">
                       <div className="pt-4 space-y-3">
                         {group.items.map((item) => (
                           <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between hover:border-riverside-red/30 transition-colors">
                             <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">
                                 {new Date(item.date_transaction).toLocaleDateString()} • Ref: {item.id.slice(0,6)}
                               </p>
                               <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.description}</p>
                             </div>
                             <div className="flex items-center gap-6">
                               <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-300 uppercase">Perçu</p>
                                 <p className="text-[10px] font-bold text-emerald-500 tabular-nums">{item.montant_verse.toLocaleString()}</p>
                               </div>
                               <div className="w-20 text-right">
                                  <span className="text-[10px] font-black text-riverside-red">{item.reste_a_payer.toLocaleString()} FCFA</span>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>

                       <div className="flex justify-end pt-2 gap-3">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             const msg = `Bonjour, Riverside Medical Center vous informe d'un reste à payer de ${group.total.toLocaleString()} FCFA. Merci de régulariser rapidement.`;
                             window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                           }}
                           className="px-4 py-2 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
                         >
                           Rappel WhatsApp
                         </button>

                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             // Load the first pending transaction of this group into the terminal
                             const firstItem = group.items[0];
                             setSelectedTransaction(firstItem);
                             setActiveTab("caise");
                             setMontantVerse(firstItem.reste_a_payer.toString());
                           }}
                           className="px-6 py-2 bg-riverside-red text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-100"
                         >
                           <CreditCard size={14} /> Solder la dette
                         </button>
                       </div>
                    </div>
                  </details>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Riverside Total Connect: Interactive Flow Simulator */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-slate-950 rounded-[3rem] p-10 lg:p-16 text-white border border-white/5 relative overflow-hidden mt-12"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-riverside-red/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
            <div>
              <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4">
                <div className="w-12 h-12 bg-riverside-red rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/20">
                  <Activity size={24} />
                </div>
                RIVERSIDE <span className="text-riverside-red">TOTAL CONNECT</span>
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Simulateur Interactif de Flux de Données</p>
            </div>
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Système de Synchronisation Actif
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 relative group hover:bg-white/[0.08] transition-colors">
              <div className="w-10 h-10 bg-riverside-red rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/10 font-black text-xs">1</div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-3">Pôle Médical</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Le médecin valide la consultation. L&apos;IA génère l&apos;ordonnance et transmet instantanément l&apos;ordre de prélèvement à la caisse.</p>
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <span>Data Out</span>
                <span className="text-riverside-red">→ Caisse</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 relative group hover:bg-white/[0.08] transition-colors">
              <div className="w-10 h-10 bg-riverside-red rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/10 font-black text-xs">2</div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-3">Pôle Trésorerie</h4>
              <p className="text-xs text-slate-400 leading-relaxed">La caissière réceptionne la facture. Une fois le paiement validé, le système clôture le séjour du patient et déclenche la sortie de stock.</p>
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <span>Action</span>
                <span className="text-emerald-500">→ Validation</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 relative group hover:bg-white/[0.08] transition-colors">
              <div className="w-10 h-10 bg-riverside-red rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/10 font-black text-xs">3</div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-3">Pôle Pharmacie</h4>
              <p className="text-xs text-slate-400 leading-relaxed">La pharmacie reçoit l&apos;ordre de délivrance. Le stock est mis à jour automatiquement et les alertes sont envoyées au Patron.</p>
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <span>Update</span>
                <span className="text-blue-500">→ Stock Final</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/98 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-200"
            >
              <CheckCircle size={48} />
            </motion.div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">ENCAISSEMENT RÉUSSI</h3>
            <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">La transaction a été archivée avec succès.<br/>Prêt pour l&apos;impression du reçu fiscal.</p>
            <div className="mt-8 flex items-center gap-4">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest bg-slate-900 px-6 py-3 rounded-xl shadow-lg hover:bg-black transition-all"
              >
                <Printer size={16} /> Imprimer le reçu
              </button>
              <button 
                onClick={() => setSuccess(false)} 
                className="text-[10px] font-black text-riverside-red uppercase tracking-widest bg-red-50 px-6 py-3 rounded-xl border border-red-100 hover:bg-red-100 transition-all"
              >
                Nouvelle Facture
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
