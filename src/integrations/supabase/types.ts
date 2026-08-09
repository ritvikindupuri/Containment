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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          policy_id: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          policy_id?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          policy_id?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          action: Json
          action_type: Database["public"]["Enums"]["guard_action_type"]
          advisor_agrees: boolean | null
          advisor_at: string | null
          advisor_concerns: Json | null
          advisor_headline: string | null
          advisor_level: string | null
          advisor_score: number | null
          agent_id: string | null
          api_key_id: string | null
          approval_state: string
          created_at: string
          enforced: boolean
          id: string
          policy_id: string | null
          policy_version: number | null
          reasons: Json
          resolution_note: string | null
          resolved_at: string | null
          review_conditions: string | null
          review_reasoning: string | null
          review_recommendation: string | null
          reviewed_at: string | null
          risk_score: number
          source: string
          user_id: string
          verdict: Database["public"]["Enums"]["guard_verdict"]
        }
        Insert: {
          action?: Json
          action_type: Database["public"]["Enums"]["guard_action_type"]
          advisor_agrees?: boolean | null
          advisor_at?: string | null
          advisor_concerns?: Json | null
          advisor_headline?: string | null
          advisor_level?: string | null
          advisor_score?: number | null
          agent_id?: string | null
          api_key_id?: string | null
          approval_state?: string
          created_at?: string
          enforced?: boolean
          id?: string
          policy_id?: string | null
          policy_version?: number | null
          reasons?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          review_conditions?: string | null
          review_reasoning?: string | null
          review_recommendation?: string | null
          reviewed_at?: string | null
          risk_score?: number
          source?: string
          user_id: string
          verdict: Database["public"]["Enums"]["guard_verdict"]
        }
        Update: {
          action?: Json
          action_type?: Database["public"]["Enums"]["guard_action_type"]
          advisor_agrees?: boolean | null
          advisor_at?: string | null
          advisor_concerns?: Json | null
          advisor_headline?: string | null
          advisor_level?: string | null
          advisor_score?: number | null
          agent_id?: string | null
          api_key_id?: string | null
          approval_state?: string
          created_at?: string
          enforced?: boolean
          id?: string
          policy_id?: string | null
          policy_version?: number | null
          reasons?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          review_conditions?: string | null
          review_reasoning?: string | null
          review_recommendation?: string | null
          reviewed_at?: string | null
          risk_score?: number
          source?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["guard_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "decisions_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_sessions: {
        Row: {
          created_at: string
          examples_run: number
          id: string
          ingested_at: string
          is_current: boolean
          live_run_done: boolean
          local_id: string
          plan: Json
          policy_approved: boolean
          policy_version: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          examples_run?: number
          id?: string
          ingested_at?: string
          is_current?: boolean
          live_run_done?: boolean
          local_id: string
          plan: Json
          policy_approved?: boolean
          policy_version?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          examples_run?: number
          id?: string
          ingested_at?: string
          is_current?: boolean
          live_run_done?: boolean
          local_id?: string
          plan?: Json
          policy_approved?: boolean
          policy_version?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          allowed_hosts: string[]
          allowed_write_paths: string[]
          approval_required_tools: string[]
          approval_threshold: number
          block_filesystem: boolean
          block_injection: boolean
          block_network: boolean
          block_shell: boolean
          created_at: string
          deny_threshold: number
          id: string
          is_default: boolean
          mode: Database["public"]["Enums"]["guard_mode"]
          name: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          allowed_hosts?: string[]
          allowed_write_paths?: string[]
          approval_required_tools?: string[]
          approval_threshold?: number
          block_filesystem?: boolean
          block_injection?: boolean
          block_network?: boolean
          block_shell?: boolean
          created_at?: string
          deny_threshold?: number
          id?: string
          is_default?: boolean
          mode?: Database["public"]["Enums"]["guard_mode"]
          name: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          allowed_hosts?: string[]
          allowed_write_paths?: string[]
          approval_required_tools?: string[]
          approval_threshold?: number
          block_filesystem?: boolean
          block_injection?: boolean
          block_network?: boolean
          block_shell?: boolean
          created_at?: string
          deny_threshold?: number
          id?: string
          is_default?: boolean
          mode?: Database["public"]["Enums"]["guard_mode"]
          name?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      policy_versions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          policy_id: string
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          policy_id: string
          snapshot?: Json
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          policy_id?: string
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarded_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarded_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarded_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      guard_action_type:
        | "shell"
        | "file_read"
        | "file_write"
        | "network"
        | "tool_call"
      guard_mode: "enforce" | "monitor"
      guard_verdict: "allow" | "deny" | "needs_approval"
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
      guard_action_type: [
        "shell",
        "file_read",
        "file_write",
        "network",
        "tool_call",
      ],
      guard_mode: ["enforce", "monitor"],
      guard_verdict: ["allow", "deny", "needs_approval"],
    },
  },
} as const
