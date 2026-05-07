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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_configs: {
        Row: {
          accepts_financing: boolean | null
          accepts_trade: boolean | null
          address: string | null
          agent_role: string | null
          assistant_name: string | null
          auto_schedule: boolean | null
          business_days: string | null
          cash_message: string | null
          closed_days: string | null
          collect_lead_data: boolean | null
          created_at: string | null
          cutoff_time: string | null
          deal_format_question: string | null
          dealership_id: string
          extra_rules: string | null
          final_action: string | null
          financing_factor: number | null
          financing_installments: number | null
          financing_message: string | null
          greeting_message_no_name: string | null
          greeting_message_no_product: string | null
          id: string
          latitude: number | null
          longitude: number | null
          objective: string | null
          off_hours_message: string | null
          operating_hours_end: string | null
          operating_hours_start: string | null
          pause_duration_seconds: number | null
          product_question: string | null
          send_photos: boolean | null
          send_specs: boolean | null
          system_prompt: string | null
          tone: string | null
          tone_description: string | null
          trade_message: string | null
          trade_photos_message: string | null
          transfer_to_human: boolean | null
          updated_at: string | null
          value_points: string | null
          value_techniques: string | null
          welcome_message: string | null
        }
        Insert: {
          accepts_financing?: boolean | null
          accepts_trade?: boolean | null
          address?: string | null
          agent_role?: string | null
          assistant_name?: string | null
          auto_schedule?: boolean | null
          business_days?: string | null
          cash_message?: string | null
          closed_days?: string | null
          collect_lead_data?: boolean | null
          created_at?: string | null
          cutoff_time?: string | null
          deal_format_question?: string | null
          dealership_id: string
          extra_rules?: string | null
          final_action?: string | null
          financing_factor?: number | null
          financing_installments?: number | null
          financing_message?: string | null
          greeting_message_no_name?: string | null
          greeting_message_no_product?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          objective?: string | null
          off_hours_message?: string | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          pause_duration_seconds?: number | null
          product_question?: string | null
          send_photos?: boolean | null
          send_specs?: boolean | null
          system_prompt?: string | null
          tone?: string | null
          tone_description?: string | null
          trade_message?: string | null
          trade_photos_message?: string | null
          transfer_to_human?: boolean | null
          updated_at?: string | null
          value_points?: string | null
          value_techniques?: string | null
          welcome_message?: string | null
        }
        Update: {
          accepts_financing?: boolean | null
          accepts_trade?: boolean | null
          address?: string | null
          agent_role?: string | null
          assistant_name?: string | null
          auto_schedule?: boolean | null
          business_days?: string | null
          cash_message?: string | null
          closed_days?: string | null
          collect_lead_data?: boolean | null
          created_at?: string | null
          cutoff_time?: string | null
          deal_format_question?: string | null
          dealership_id?: string
          extra_rules?: string | null
          final_action?: string | null
          financing_factor?: number | null
          financing_installments?: number | null
          financing_message?: string | null
          greeting_message_no_name?: string | null
          greeting_message_no_product?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          objective?: string | null
          off_hours_message?: string | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          pause_duration_seconds?: number | null
          product_question?: string | null
          send_photos?: boolean | null
          send_specs?: boolean | null
          system_prompt?: string | null
          tone?: string | null
          tone_description?: string | null
          trade_message?: string | null
          trade_photos_message?: string | null
          transfer_to_human?: boolean | null
          updated_at?: string | null
          value_points?: string | null
          value_techniques?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: true
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string | null
          dealership_id: string
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_at: string
          title: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          vehicle_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          dealership_id: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at: string
          title?: string | null
          type: Database["public"]["Enums"]["appointment_type"]
          vehicle_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          dealership_id?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string
          title?: string | null
          type?: Database["public"]["Enums"]["appointment_type"]
          vehicle_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concessionaria_mensagens: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_active: boolean | null
          created_at: string | null
          dealership_id: string
          id: string
          last_message_at: string | null
          lead_id: string | null
          unread_count: number | null
        }
        Insert: {
          agent_active?: boolean | null
          created_at?: string | null
          dealership_id: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          unread_count?: number | null
        }
        Update: {
          agent_active?: boolean | null
          created_at?: string | null
          dealership_id?: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dealerships: {
        Row: {
          address: string | null
          admin_phone: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_users: number | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          responsible: string | null
          slug: string | null
          state: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_phone?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          responsible?: string | null
          slug?: string | null
          state?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_phone?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          responsible?: string | null
          slug?: string | null
          state?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string | null
          dealership_id: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          dealership_id: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          dealership_id?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          created_at: string | null
          id: string
          openai_api_key: string | null
          support_whatsapp: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          openai_api_key?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          openai_api_key?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      glxcompany_chats: {
        Row: {
          data: string | null
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          data?: string | null
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          data?: string | null
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      knowledge_base_files: {
        Row: {
          created_at: string | null
          dealership_id: string
          file_name: string
          file_size: string | null
          file_url: string | null
          id: string
          status: Database["public"]["Enums"]["kb_file_status"] | null
        }
        Insert: {
          created_at?: string | null
          dealership_id: string
          file_name: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["kb_file_status"] | null
        }
        Update: {
          created_at?: string | null
          dealership_id?: string
          file_name?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["kb_file_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_files_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          dealership_id: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          tags: string[] | null
          vehicle_of_interest: string | null
        }
        Insert: {
          created_at?: string | null
          dealership_id: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          vehicle_of_interest?: string | null
        }
        Update: {
          created_at?: string | null
          dealership_id?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          vehicle_of_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vehicle_of_interest_fkey"
            columns: ["vehicle_of_interest"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_bot: boolean | null
          sender: Database["public"]["Enums"]["conversation_sender"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          sender: Database["public"]["Enums"]["conversation_sender"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          sender?: Database["public"]["Enums"]["conversation_sender"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          dealership_id: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          dealership_id?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          dealership_id?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          dealership_id: string
          fuel: string | null
          id: string
          images: string[] | null
          km: number | null
          model: string
          price: number | null
          slug: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          year: string | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string | null
          dealership_id: string
          fuel?: string | null
          id?: string
          images?: string[] | null
          km?: number | null
          model: string
          price?: number | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          year?: string | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          dealership_id?: string
          fuel?: string | null
          id?: string
          images?: string[] | null
          km?: number | null
          model?: string
          price?: number | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          admin_field_01: string | null
          created_at: string | null
          dealership_id: string
          id: string
          instance_id: string | null
          instance_name: string | null
          pairing_code: string | null
          phone: string | null
          qr_code: string | null
          status: string | null
          token: string | null
          updated_at: string | null
          webhook_created: boolean | null
          webhook_url: string | null
        }
        Insert: {
          admin_field_01?: string | null
          created_at?: string | null
          dealership_id: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          pairing_code?: string | null
          phone?: string | null
          qr_code?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          webhook_created?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          admin_field_01?: string | null
          created_at?: string | null
          dealership_id?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          pairing_code?: string | null
          phone?: string | null
          qr_code?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string | null
          webhook_created?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_dealership_with_admin: {
        Args: {
          p_address?: string
          p_admin_email?: string
          p_admin_name?: string
          p_admin_password?: string
          p_city?: string
          p_cnpj?: string
          p_dealership_name: string
          p_email?: string
          p_max_users?: number
          p_phone?: string
          p_plan?: string
          p_responsible?: string
          p_slug?: string
          p_state?: string
          p_website?: string
        }
        Returns: Json
      }
      create_vendor_user: {
        Args: { p_email: string; p_full_name: string; p_password: string }
        Returns: string
      }
      delete_dealership_complete: {
        Args: { p_dealership_id: string }
        Returns: undefined
      }
      get_my_dealership_id: { Args: never; Returns: string }
      get_user_dealership_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_type: "visita" | "test_drive" | "retorno" | "entrega"
      conversation_sender: "customer" | "agent" | "human"
      kb_file_status: "processando" | "ativo" | "erro"
      lead_status:
        | "novo"
        | "em_contato"
        | "qualificado"
        | "convertido"
        | "perdido"
      plan_type: "starter" | "pro" | "enterprise"
      user_role: "admin" | "manager" | "vendor"
      vehicle_fuel: "flex" | "gasolina" | "diesel" | "eletrico" | "hibrido"
      vehicle_status: "disponivel" | "reservado" | "vendido"
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
    Enums: {
      appointment_type: ["visita", "test_drive", "retorno", "entrega"],
      conversation_sender: ["customer", "agent", "human"],
      kb_file_status: ["processando", "ativo", "erro"],
      lead_status: [
        "novo",
        "em_contato",
        "qualificado",
        "convertido",
        "perdido",
      ],
      plan_type: ["starter", "pro", "enterprise"],
      user_role: ["admin", "manager", "vendor"],
      vehicle_fuel: ["flex", "gasolina", "diesel", "eletrico", "hibrido"],
      vehicle_status: ["disponivel", "reservado", "vendido"],
    },
  },
} as const
