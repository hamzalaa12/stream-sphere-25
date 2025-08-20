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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      content: {
        Row: {
          backdrop_url: string | null
          categories: Database["public"]["Enums"]["content_category"][] | null
          content_type: Database["public"]["Enums"]["content_type"]
          country: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_netflix: boolean | null
          language: string | null
          poster_url: string | null
          rating: number | null
          release_date: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          title_en: string | null
          trailer_url: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          backdrop_url?: string | null
          categories?: Database["public"]["Enums"]["content_category"][] | null
          content_type: Database["public"]["Enums"]["content_type"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_netflix?: boolean | null
          language?: string | null
          poster_url?: string | null
          rating?: number | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          title_en?: string | null
          trailer_url?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          backdrop_url?: string | null
          categories?: Database["public"]["Enums"]["content_category"][] | null
          content_type?: Database["public"]["Enums"]["content_type"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_netflix?: boolean | null
          language?: string | null
          poster_url?: string | null
          rating?: number | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          title_en?: string | null
          trailer_url?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          episode_number: number
          id: string
          release_date: string | null
          season_id: string
          thumbnail_url: string | null
          title: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_number: number
          id?: string
          release_date?: string | null
          season_id: string
          thumbnail_url?: string | null
          title?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_number?: number
          id?: string
          release_date?: string | null
          season_id?: string
          thumbnail_url?: string | null
          title?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          content_id: string
          created_at: string
          id: string
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          content_id: string
          created_at?: string
          id?: string
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          content_id?: string
          created_at?: string
          id?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          content_id: string
          created_at: string
          description: string | null
          episode_count: number | null
          id: string
          poster_url: string | null
          release_date: string | null
          season_number: number
          title: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          description?: string | null
          episode_count?: number | null
          id?: string
          poster_url?: string | null
          release_date?: string | null
          season_number: number
          title?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          description?: string | null
          episode_count?: number | null
          id?: string
          poster_url?: string | null
          release_date?: string | null
          season_number?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_links: {
        Row: {
          content_id: string | null
          created_at: string
          download_url: string | null
          episode_id: string | null
          id: string
          is_active: boolean | null
          quality: string
          server_name: string
          streaming_url: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          download_url?: string | null
          episode_id?: string | null
          id?: string
          is_active?: boolean | null
          quality: string
          server_name: string
          streaming_url: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          download_url?: string | null
          episode_id?: string | null
          id?: string
          is_active?: boolean | null
          quality?: string
          server_name?: string
          streaming_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaming_links_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaming_links_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          completed: boolean | null
          content_id: string | null
          episode_id: string | null
          id: string
          last_watched: string
          user_id: string
          watch_time: number | null
        }
        Insert: {
          completed?: boolean | null
          content_id?: string | null
          episode_id?: string | null
          id?: string
          last_watched?: string
          user_id: string
          watch_time?: number | null
        }
        Update: {
          completed?: boolean | null
          content_id?: string | null
          episode_id?: string | null
          id?: string
          last_watched?: string
          user_id?: string
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
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
      content_category:
        | "action"
        | "drama"
        | "comedy"
        | "romance"
        | "thriller"
        | "horror"
        | "sci-fi"
        | "fantasy"
        | "documentary"
        | "animation"
      content_status: "released" | "ongoing" | "upcoming" | "completed"
      content_type: "movie" | "series" | "anime"
      user_role: "user" | "admin" | "moderator"
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
      content_category: [
        "action",
        "drama",
        "comedy",
        "romance",
        "thriller",
        "horror",
        "sci-fi",
        "fantasy",
        "documentary",
        "animation",
      ],
      content_status: ["released", "ongoing", "upcoming", "completed"],
      content_type: ["movie", "series", "anime"],
      user_role: ["user", "admin", "moderator"],
    },
  },
} as const
