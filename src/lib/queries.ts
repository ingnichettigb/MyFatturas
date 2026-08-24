import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, Commessa, Fattura, Impostazioni, Preventivo } from "@/lib/ngb";

export function useImpostazioni() {
  return useQuery({
    queryKey: ["impostazioni"],
    queryFn: async (): Promise<Impostazioni | null> => {
      const { data, error } = await supabase.from("impostazioni").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClienti() {
  return useQuery({
    queryKey: ["clienti"],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clienti")
        .select("*")
        .order("ragione_sociale", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCommesse() {
  return useQuery({
    queryKey: ["commesse"],
    queryFn: async (): Promise<Commessa[]> => {
      const { data, error } = await supabase
        .from("commesse")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePreventivi() {
  return useQuery({
    queryKey: ["preventivi"],
    queryFn: async (): Promise<Preventivo[]> => {
      const { data, error } = await supabase
        .from("preventivi")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFatture() {
  return useQuery({
    queryKey: ["fatture"],
    queryFn: async (): Promise<Fattura[]> => {
      const { data, error } = await supabase
        .from("fatture")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
