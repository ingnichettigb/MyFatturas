export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clienti: {
        Row: {
          attivo: boolean
          cap: string
          cf: string
          citta: string
          created_at: string
          email: string
          id: string
          indirizzo: string
          note: string
          pec: string
          piva: string
          provincia: string
          ragione_sociale: string
          referente: string
          sdi: string
          telefono: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          cap?: string
          cf?: string
          citta?: string
          created_at?: string
          email?: string
          id?: string
          indirizzo?: string
          note?: string
          pec?: string
          piva?: string
          provincia?: string
          ragione_sociale: string
          referente?: string
          sdi?: string
          telefono?: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          cap?: string
          cf?: string
          citta?: string
          created_at?: string
          email?: string
          id?: string
          indirizzo?: string
          note?: string
          pec?: string
          piva?: string
          provincia?: string
          ragione_sociale?: string
          referente?: string
          sdi?: string
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      commesse: {
        Row: {
          cliente_id: string | null
          codice: string
          created_at: string
          descrizione: string
          disegno: string
          id: string
          note: string
          riferimento: string
          stato: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          codice: string
          created_at?: string
          descrizione?: string
          disegno?: string
          id?: string
          note?: string
          riferimento?: string
          stato?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          codice?: string
          created_at?: string
          descrizione?: string
          disegno?: string
          id?: string
          note?: string
          riferimento?: string
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commesse_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      fattura_righe: {
        Row: {
          commessa_id: string | null
          created_at: string
          descrizione: string
          fattura_id: string
          id: string
          importo: number
          ordinamento: number
          ore: number
          prezzo_ora: number
        }
        Insert: {
          commessa_id?: string | null
          created_at?: string
          descrizione?: string
          fattura_id: string
          id?: string
          importo?: number
          ordinamento?: number
          ore?: number
          prezzo_ora?: number
        }
        Update: {
          commessa_id?: string | null
          created_at?: string
          descrizione?: string
          fattura_id?: string
          id?: string
          importo?: number
          ordinamento?: number
          ore?: number
          prezzo_ora?: number
        }
        Relationships: [
          {
            foreignKeyName: "fattura_righe_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fattura_righe_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture: {
        Row: {
          anno: number
          bollo: number
          cliente_id: string | null
          contributo: number
          contributo_pct: number
          created_at: string
          data: string
          data_ordine: string | null
          data_pagamento: string | null
          descrizione: string
          id: string
          imponibile: number
          note: string
          numero: string
          numero_ordine: string
          oggetto: string
          periodo: string | null
          preavviso_id: string | null
          premessa: string
          preventivo_id: string | null
          ritenuta: number
          scadenza: string | null
          sconto_pct: number
          stato: string
          tariffa_oraria: number
          tipo: string
          totale: number
          totale_ore: number
          updated_at: string
        }
        Insert: {
          anno: number
          bollo?: number
          cliente_id?: string | null
          contributo?: number
          contributo_pct?: number
          created_at?: string
          data?: string
          data_ordine?: string | null
          data_pagamento?: string | null
          descrizione?: string
          id?: string
          imponibile?: number
          note?: string
          numero: string
          numero_ordine?: string
          oggetto?: string
          periodo?: string | null
          preavviso_id?: string | null
          premessa?: string
          preventivo_id?: string | null
          ritenuta?: number
          scadenza?: string | null
          sconto_pct?: number
          stato?: string
          tariffa_oraria?: number
          tipo?: string
          totale?: number
          totale_ore?: number
          updated_at?: string
        }
        Update: {
          anno?: number
          bollo?: number
          cliente_id?: string | null
          contributo?: number
          contributo_pct?: number
          created_at?: string
          data?: string
          data_ordine?: string | null
          data_pagamento?: string | null
          descrizione?: string
          id?: string
          imponibile?: number
          note?: string
          numero?: string
          numero_ordine?: string
          oggetto?: string
          periodo?: string | null
          preavviso_id?: string | null
          premessa?: string
          preventivo_id?: string | null
          ritenuta?: number
          scadenza?: string | null
          sconto_pct?: number
          stato?: string
          tariffa_oraria?: number
          tipo?: string
          totale?: number
          totale_ore?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fatture_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_preavviso_id_fkey"
            columns: ["preavviso_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni: {
        Row: {
          attivita: string
          bollo: number
          contributo_pct: number
          created_at: string
          id: string
          ritenuta_pct: number
          sconto_pct: number
          studio_banca: string
          studio_cap: string
          studio_cf: string
          studio_citta: string
          studio_email: string
          studio_fax: string
          studio_iban: string
          studio_indirizzo: string
          studio_nome: string
          studio_piva: string
          studio_provincia: string
          studio_sdi: string
          studio_tel: string
          tariffa_oraria: number
          testo_bollo: string
          testo_forfettario: string
          testo_franchigia: string
          testo_pagamento: string
          testo_ritenuta: string
          testo_spese_anticipate: string
          updated_at: string
        }
        Insert: {
          attivita?: string
          bollo?: number
          contributo_pct?: number
          created_at?: string
          id?: string
          ritenuta_pct?: number
          sconto_pct?: number
          studio_banca?: string
          studio_cap?: string
          studio_cf?: string
          studio_citta?: string
          studio_email?: string
          studio_fax?: string
          studio_iban?: string
          studio_indirizzo?: string
          studio_nome?: string
          studio_piva?: string
          studio_provincia?: string
          studio_sdi?: string
          studio_tel?: string
          tariffa_oraria?: number
          testo_bollo?: string
          testo_forfettario?: string
          testo_franchigia?: string
          testo_pagamento?: string
          testo_ritenuta?: string
          testo_spese_anticipate?: string
          updated_at?: string
        }
        Update: {
          attivita?: string
          bollo?: number
          contributo_pct?: number
          created_at?: string
          id?: string
          ritenuta_pct?: number
          sconto_pct?: number
          studio_banca?: string
          studio_cap?: string
          studio_cf?: string
          studio_citta?: string
          studio_email?: string
          studio_fax?: string
          studio_iban?: string
          studio_indirizzo?: string
          studio_nome?: string
          studio_piva?: string
          studio_provincia?: string
          studio_sdi?: string
          studio_tel?: string
          tariffa_oraria?: number
          testo_bollo?: string
          testo_forfettario?: string
          testo_franchigia?: string
          testo_pagamento?: string
          testo_ritenuta?: string
          testo_spese_anticipate?: string
          updated_at?: string
        }
        Relationships: []
      }
      preventivi: {
        Row: {
          anno: number
          bollo: number
          cliente_id: string | null
          commessa_id: string | null
          contributo: number
          contributo_pct: number
          created_at: string
          data: string
          data_ordine: string | null
          descrizione: string
          id: string
          imponibile: number
          note: string
          numero: string
          numero_ordine: string
          oggetto: string
          premessa: string
          sconto_pct: number
          stato: string
          tariffa_oraria: number
          totale: number
          totale_ore: number
          updated_at: string
          validita: string
        }
        Insert: {
          anno: number
          bollo?: number
          cliente_id?: string | null
          commessa_id?: string | null
          contributo?: number
          contributo_pct?: number
          created_at?: string
          data?: string
          data_ordine?: string | null
          descrizione?: string
          id?: string
          imponibile?: number
          note?: string
          numero: string
          numero_ordine?: string
          oggetto?: string
          premessa?: string
          sconto_pct?: number
          stato?: string
          tariffa_oraria?: number
          totale?: number
          totale_ore?: number
          updated_at?: string
          validita?: string
        }
        Update: {
          anno?: number
          bollo?: number
          cliente_id?: string | null
          commessa_id?: string | null
          contributo?: number
          contributo_pct?: number
          created_at?: string
          data?: string
          data_ordine?: string | null
          descrizione?: string
          id?: string
          imponibile?: number
          note?: string
          numero?: string
          numero_ordine?: string
          oggetto?: string
          premessa?: string
          sconto_pct?: number
          stato?: string
          tariffa_oraria?: number
          totale?: number
          totale_ore?: number
          updated_at?: string
          validita?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventivi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivo_righe: {
        Row: {
          created_at: string
          descrizione: string
          id: string
          importo: number
          ordinamento: number
          ore: number
          posizione: string
          preventivo_id: string
          prezzo_ora: number
          quantita: number
        }
        Insert: {
          created_at?: string
          descrizione?: string
          id?: string
          importo?: number
          ordinamento?: number
          ore?: number
          posizione?: string
          preventivo_id: string
          prezzo_ora?: number
          quantita?: number
        }
        Update: {
          created_at?: string
          descrizione?: string
          id?: string
          importo?: number
          ordinamento?: number
          ore?: number
          posizione?: string
          preventivo_id?: string
          prezzo_ora?: number
          quantita?: number
        }
        Relationships: [
          {
            foreignKeyName: "preventivo_righe_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
