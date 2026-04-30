import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    // Création de l'utilisateur avec Supabase Admin SDK
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Optionnel: Créer une entrée dans une table "profils" si elle existe
    // const { error: profileError } = await supabaseAdmin
    //   .from('profils')
    //   .insert([{ id: data.user.id, email, role }]);

    return NextResponse.json({ 
      message: "Utilisateur créé avec succès", 
      user: data.user 
    });

  } catch (err: any) {
    console.error("Admin Create User Error:", err);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
