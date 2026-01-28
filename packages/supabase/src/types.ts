/**
 * Supabase Database 타입 정의
 *
 * 추후 `npx supabase gen types typescript` 명령으로 자동 생성하여
 * 이 파일을 교체하세요.
 *
 * 참고: supabase/config.toml 프로젝트 설정 후 실행 가능
 */
export type SessionStatus = "idle" | "active" | "paused" | "ended";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          subscription_tier: Database["public"]["Enums"]["subscription_tier"];
          max_concurrent_sessions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          max_concurrent_sessions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          max_concurrent_sessions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["organization_member_role"];
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["organization_member_role"];
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["organization_member_role"];
          invited_by?: string | null;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyColumn: "organization_id";
            referencedColumn: "id";
            referencedTable: "organizations";
          },
          {
            foreignKeyColumn: "user_id";
            referencedColumn: "id";
            referencedTable: "users";
          },
          {
            foreignKeyColumn: "invited_by";
            referencedColumn: "id";
            referencedTable: "users";
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          soniox_api_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          soniox_api_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          soniox_api_key?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          name: string;
          code: string;
          password: string;
          source_lang: string;
          target_lang: string;
          target_langs: string[] | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          name: string;
          code: string;
          password: string;
          source_lang?: string;
          target_lang?: string;
          target_langs?: string[] | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          name?: string;
          code?: string;
          password?: string;
          source_lang?: string;
          target_lang?: string;
          target_langs?: string[] | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyColumn: "organization_id";
            referencedColumn: "id";
            referencedTable: "organizations";
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          project_id: string;
          status: string;
          started_at: string;
          ended_at: string | null;
          audio_file_path: string | null;
          audio_duration_ms: number | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          audio_file_path?: string | null;
          audio_duration_ms?: number | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          audio_file_path?: string | null;
          audio_duration_ms?: number | null;
        };
        Relationships: [];
      };
      interpretations: {
        Row: {
          id: string;
          session_id: string;
          original_text: string;
          translated_text: string;
          is_final: boolean;
          sequence: number;
          created_at: string;
          target_language: string | null;
          start_time_ms: number | null;
          end_time_ms: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          original_text: string;
          translated_text: string;
          is_final?: boolean;
          sequence: number;
          created_at?: string;
          target_language?: string | null;
          start_time_ms?: number | null;
          end_time_ms?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          original_text?: string;
          translated_text?: string;
          is_final?: boolean;
          sequence?: number;
          created_at?: string;
          target_language?: string | null;
          start_time_ms?: number | null;
          end_time_ms?: number | null;
        };
        Relationships: [];
      };
      supported_languages: {
        Row: {
          code: string;
          name: string;
          native_name: string;
        };
        Insert: {
          code: string;
          name: string;
          native_name: string;
        };
        Update: {
          code?: string;
          name?: string;
          native_name?: string;
        };
        Relationships: [];
      };
      audio_chunks: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          storage_path: string;
          start_time_ms: number;
          end_time_ms: number;
          duration_ms: number;
          file_size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          storage_path: string;
          start_time_ms: number;
          end_time_ms: number;
          file_size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          chunk_index?: number;
          storage_path?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          file_size_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyColumn: "session_id";
            referencedColumn: "id";
            referencedTable: "sessions";
          },
        ];
      };
      project_target_languages: {
        Row: {
          id: string;
          project_id: string;
          language_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          language_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          language_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      organization_member_role: "owner" | "admin" | "interpreter" | "viewer";
      subscription_tier: "free" | "pro" | "enterprise";
    };
  };
}
