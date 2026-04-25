import { supabase } from './supabase';

export async function seedRiversideData() {
  console.log("Démarrage du peuplement de la base de données Riverside...");

  // A. Table assurances
  const assurances = [
    { nom: "ASCOMA" },
    { nom: "WILLIS TOWER" },
    { nom: "CHANAS" },
    { nom: "AXA" },
    { nom: "PASS-24" },
    { nom: "MUTUELLE - BICEC" },
    { nom: "ECO-BANK" },
    { nom: "ALLIANZ" },
    { nom: "P. A. D." },
    { nom: "SUNU" },
    { nom: "GMC" }
  ];

  const { error: errAssurance } = await supabase.from('assurances').upsert(assurances, { onConflict: 'nom' });
  if (errAssurance) console.error("Erreur seeding assurances:", errAssurance);
  else console.log("Assurances insérées.");

  // B. Table personnel
  const personnel = [
    { nom_complet: "Dr TONYE Pierre William", fonction: "Médecin", categorie_staff: "Permanent" },
    { nom_complet: "Dr JONGWANE TOKO Emmanuel", fonction: "Médecin", categorie_staff: "Permanent" },
    { nom_complet: "Dr KALEFACK Armand", fonction: "Médecin", categorie_staff: "Permanent" },
    { nom_complet: "Dr NGABIWELE Julie", fonction: "Médecin", categorie_staff: "Consultant" },
    { nom_complet: "Dr JOHNES MARCEL", fonction: "Médecin", categorie_staff: "Consultant" },
    { nom_complet: "Dr NGALLE Diane", fonction: "Médecin", categorie_staff: "Permanent" },
    { nom_complet: "NDOUMBE MPONDO Christian", fonction: "Infirmier", categorie_staff: "Permanent" },
    { nom_complet: "ESSANG Flore Sidonie", fonction: "Infirmier", categorie_staff: "Permanent" },
    { nom_complet: "TOUTOU NDAME Emilienne", fonction: "Infirmier", categorie_staff: "Permanent" },
    { nom_complet: "YEDNA Marcel Renée", fonction: "Infirmier", categorie_staff: "Major" },
    { nom_complet: "NGOULA Schalsiane", fonction: "Infirmier", categorie_staff: "Permanent" },
    { nom_complet: "MOUTO Benedicte", fonction: "Laborantin", categorie_staff: "Permanent" },
    { nom_complet: "TAMONKA Ernest", fonction: "Laborantin", categorie_staff: "Permanent" },
    { nom_complet: "ENDALLE BOJONDE Dorette", fonction: "Administratif", categorie_staff: "Permanent" },
    { nom_complet: "BISSAI Salomon R", fonction: "Administratif", categorie_staff: "Comptable" },
    { nom_complet: "MEBOUGA EKODECK Olive", fonction: "Administratif", categorie_staff: "Secrétaire" }
  ];

  const { error: errPersonnel } = await supabase.from('personnel').upsert(personnel, { onConflict: 'nom_complet' });
  if (errPersonnel) console.error("Erreur seeding personnel:", errPersonnel);
  else console.log("Personnel inséré.");

  // C. Table chambres
  const chambres = [
    { numero: "211" },
    { numero: "P4" },
    { numero: "207" },
    { numero: "208" },
    { numero: "209" },
    { numero: "210" },
    { numero: "202" },
    { numero: "204" },
    { numero: "205" }
  ];

  const { error: errChambres } = await supabase.from('chambres').upsert(chambres, { onConflict: 'numero' });
  if (errChambres) console.error("Erreur seeding chambres:", errChambres);
  else console.log("Chambres insérées.");

  // D. Table stocks
  const stocks = [
    { designation: "Paracétamol 500mg", categorie: "Médicament", quantite_actuelle: 150, seuil_alerte: 50 },
    { designation: "Gants Stériles", categorie: "Consommable", quantite_actuelle: 5, seuil_alerte: 10 },
    { designation: "Seringues 5ml", categorie: "Consommable", quantite_actuelle: 12, seuil_alerte: 20 },
    { designation: "Bétadine", categorie: "Consommable", quantite_actuelle: 8, seuil_alerte: 5 }
  ];
  await supabase.from('stocks').upsert(stocks, { onConflict: 'designation' });

  // E. Table transactions_caisse
  const transactions = [
    { montant_total: 15000, methode_paiement: "Cash", type_flux: "Revenu - Patient", statut_paiement: "Payé" },
    { montant_total: 45000, methode_paiement: "Assurance", type_flux: "Revenu - Patient", statut_paiement: "Payé" },
    { montant_total: 10000, methode_paiement: "Cash", type_flux: "Revenu - Patient", statut_paiement: "Payé" }
  ];
  await supabase.from('transactions_caisse').insert(transactions);

  // F. Table rapports_garde
  const rapports = [
    { evenements: "Panne groupe électrogène pendant 10min. Pas d'incident patient.", transmissions: "Surveiller chambre 207 (post-op).", soins: "Soins standards effectués." },
    { evenements: "Rupture de gants taille M.", transmissions: "Admission prévue à 8h (Dr Tonye).", soins: "Pansements refaits toutes les 4h." }
  ];
  await supabase.from('rapports_garde').insert(rapports);

  console.log("Seeding Riverside terminé.");
}
