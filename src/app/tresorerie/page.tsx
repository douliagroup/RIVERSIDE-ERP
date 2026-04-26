"use client";

import React, { useState, useEffect } from "react";
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
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

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
  const [activeTab, setActiveTab] = useState<"caise" | "dettes">("caise");
  const [dettes, setDettes] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  
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
      
      // 1. Récupérer les séjours actifs
      const { data: sejoursData, error: sejoursError } = await supabase
        .from('sejours_actifs')
        .select('*, patients(id, nom_complet, type_assurance)')
        .filter('statut', 'neq', 'Terminé')
        .order('created_at', { ascending: false });

      if (sejoursError) throw sejoursError;
      setSejours(sejoursData || []);

      // 1b. Récupérer les transactions en attente (Liaison Médicale)
      const { data: pendingData } = await supabase
        .from('transactions_caisse')
        .select('*, patients(id, nom_complet, type_assurance)')
        .eq('statut_paiement', 'En attente')
        .order('created_at', { ascending: false });
      
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
        .select('*, patients(nom_complet)')
        .gt('reste_a_payer', 0)
        .order('date_transaction', { ascending: false });
      
      if (dettesError) console.error("Erreur dettes:", dettesError);
      else setDettes(dettesData || []);

      // 4. Récupérer les stocks consommables
      const { data: stocksData } = await supabase
        .from('stocks')
        .select('id, designation, quantite_actuelle');
      setStocks(stocksData || []);

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
    if (!selectedSejour) return 0;
    const isCashOnly = selectedSejour.patients?.type_assurance === "Cash";
    
    return cart.reduce((acc, item) => {
      return acc + (isCashOnly ? item.prix_cash : item.base_assurance);
    }, 0);
  };

  const handleValidate = async () => {
    if (!selectedSejour && !selectedTransaction) return;
    if (!selectedTransaction && cart.length === 0) return;

    setSubmitting(true);
    try {
      const total = calculateTotal();
      const verse = montantVerse ? parseFloat(montantVerse) : total;
      const reste = Math.max(0, total - verse);
      const description = selectedTransaction 
        ? selectedTransaction.description 
        : cart.map(item => item.nom_acte).join(", ");

      // 1. Enregistrer ou Mettre à jour la transaction
      if (selectedTransaction) {
        const { error: txUpdError } = await supabase
          .from('transactions_caisse')
          .update({
            montant_verse: verse,
            reste_a_payer: reste,
            statut_paiement: reste > 0 ? 'Partiel' : 'Payé'
          })
          .eq('id', selectedTransaction.id);
        if (txUpdError) throw txUpdError;
      } else {
        const { error: txError } = await supabase
          .from('transactions_caisse')
          .insert([{
            type_flux: 'Revenu - Patient',
            montant_total: total,
            montant_verse: verse,
            reste_a_payer: reste,
            description: `Facturation [${paymentMode}] patient: ${selectedSejour?.patients?.nom_complet}. Actes: ${description}`,
            statut_paiement: reste > 0 ? 'Partiel' : 'Payé',
            patient_id: selectedSejour?.patient_id
          }]);
        if (txError) throw txError;
      }

      // 2. Mettre à jour le statut du séjour si applicable
      if (selectedSejour) {
        await supabase
          .from('sejours_actifs')
          .update({ statut: 'Terminé' })
          .eq('id', selectedSejour.id);
      }

      // 3. Décrémentation AUTOMATIQUE des stocks
      // On cherche les articles du panier dans la pharmacie et les stocks généraux
      const itemsToDecrement = selectedTransaction ? [selectedTransaction.description] : cart.map(item => item.nom_acte);
      
      for (const itemName of itemsToDecrement) {
        // Tentative de trouver le médicament correspondant (recherche floue simple)
        const { data: pharmItems } = await supabase
          .from('stocks_pharmacie')
          .select('*')
          .ilike('nom', `%${itemName}%`)
          .limit(1);
        
        if (pharmItems && pharmItems.length > 0) {
          const item = pharmItems[0];
          if (item.quantite > 0) {
            await supabase
              .from('stocks_pharmacie')
              .update({ quantite: item.quantite - 1 })
              .eq('id', item.id);
          }
        }
      }

      // 4. Décrémenter le stock manuel si sélectionné (legacy support)
      if (selectedStockId) {
        const itemToDec = stocks.find(s => s.id === selectedStockId);
        if (itemToDec && itemToDec.quantite_actuelle > 0) {
          await supabase
            .from('stocks')
            .update({ quantite_actuelle: itemToDec.quantite_actuelle - 1 })
            .eq('id', selectedStockId);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setMontantVerse("");
        setSelectedSejour(null);
        setSelectedTransaction(null);
        setSelectedStockId("");
        fetchInitialData();
      }, 3000);

    } catch (err) {
      console.error("Erreur validation:", err);
      alert("Erreur lors de l'encaissement.");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedDettes = React.useMemo(() => {
    const groups: { [key: string]: { name: string, total: number, items: any[], type: 'PATIENT' | 'ASSURANCE' } } = {};
    dettes.forEach(d => {
      const p = d.patients;
      const hasAssurance = p?.type_assurance && p.type_assurance !== 'Cash';
      
      // If assurance, we might want to group by insurance name potentially, 
      // but the user asked for "by patient and by insurance".
      // Let's create a key that distinguishes them.
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
        
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
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
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-riverside-red rounded-full animate-pulse" />
                   <span className="text-[10px] text-riverside-red font-black uppercase">{pendingTransactions.length} FACTURES</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 {pendingTransactions.map(pt => (
                   <button
                    key={pt.id}
                    onClick={() => {
                      setSelectedTransaction(pt);
                      setSelectedSejour(null);
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

              {selectedTransaction || selectedSejour ? (
                <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Client</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                      (selectedTransaction?.patients?.type_assurance || selectedSejour?.patients?.type_assurance) === "Cash" ? "bg-amber-100 text-amber-600" : "bg-blue-600 text-white"
                    )}>
                      {selectedTransaction?.patients?.type_assurance || selectedSejour?.patients?.type_assurance || 'Privé'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedTransaction?.patients?.nom_complet || selectedSejour?.patients?.nom_complet}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Ref: {selectedTransaction?.id?.slice(0, 8) || selectedSejour?.id?.slice(0, 8)}</p>
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
                  <span className="text-xs font-black text-slate-800 tabular-nums">{cart.reduce((a, b) => a + (selectedSejour?.patients?.type_assurance === "Cash" ? b.prix_cash : b.base_assurance), 0).toLocaleString()} FCFA</span>
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
                  disabled={!selectedSejour || cart.length === 0 || submitting}
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
      ) : (
          <motion.div 
            key="dettes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-12"
          >
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Suivi du Recouvrement</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Dettes Patients & Assurances</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dette Totale</p>
                <p className="text-3xl font-black text-riverside-red">{dettes.reduce((acc, curr) => acc + curr.reste_a_payer, 0).toLocaleString()} FCFA</p>
              </div>
            </div>

            <div className="space-y-4">
              {groupedDettes.length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest bg-slate-50 rounded-3xl">Aucun reste à payer</div>
              ) : (
                groupedDettes.map((group, idx) => (
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

                       <div className="flex justify-end pt-2">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             const msg = `Bonjour, Riverside Medical Center vous informe d'un reste à payer de ${group.total.toLocaleString()} FCFA. Merci de régulariser rapidement.`;
                             window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                           }}
                           className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                         >
                           <CheckCircle size={14} /> Envoyer Rappel WhatsApp
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
            <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed">La transaction a été archivée avec succès.<br/>Impression du ticket en cours...</p>
            <div className="mt-8 pt-8 border-t border-slate-100 w-full">
              <button onClick={() => setSuccess(false)} className="text-[10px] font-black text-riverside-red uppercase tracking-widest bg-red-50 px-6 py-2 rounded-full">Fermer</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
