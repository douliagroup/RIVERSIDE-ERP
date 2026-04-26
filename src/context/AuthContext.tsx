"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { supabase } from '@/src/lib/supabase';
import { User } from '@supabase/supabase-js';

import { useRouter } from 'next/navigation';

type Role = 'patron' | 'comptable' | 'caissier' | 'major' | 'personnel' | 'communication' | 'accueil';

interface AuthContextType {
  user: User | null;
  userRole: Role;
  setUserRole: (role: Role) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role>('personnel');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserRole = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('personnel')
        .select('role_acces')
        .eq('email', email)
        .single();
      
      if (data && !error) {
        const role = data.role_acces as Role;
        setUserRole(role);
        Cookies.set('riverside_role', role, { expires: 7 });
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du rôle:", err);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.email!);
      } else {
        setUser(null);
        Cookies.remove('riverside_role');
        if (window.location.pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.email!);
      } else {
        setUser(null);
        Cookies.remove('riverside_role');
        if (window.location.pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSetRole = (role: Role) => {
    setUserRole(role);
    Cookies.set('riverside_role', role, { expires: 7 });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    Cookies.remove('riverside_role');
    setUser(null);
    setUserRole('personnel');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, userRole, setUserRole: handleSetRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
