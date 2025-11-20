export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          subscription_plan: 'free' | 'premium'
          line_notify_token: string | null
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          subscription_plan?: 'free' | 'premium'
          line_notify_token?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          subscription_plan?: 'free' | 'premium'
          line_notify_token?: string | null
        }
      }
      room_availability: {
        Row: {
          id: string
          date: string
          room_type: string
          is_available: boolean
          price: number | null
          last_checked_at: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          room_type: string
          is_available: boolean
          price?: number | null
          last_checked_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          room_type?: string
          is_available?: boolean
          price?: number | null
          last_checked_at?: string
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          target_dates: string[]
          target_room_types: string[]
          notification_via_email: boolean
          notification_via_line: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_dates?: string[]
          target_room_types?: string[]
          notification_via_email?: boolean
          notification_via_line?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_dates?: string[]
          target_room_types?: string[]
          notification_via_email?: boolean
          notification_via_line?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notification_history: {
        Row: {
          id: string
          user_id: string
          room_availability_id: string
          notification_type: 'email' | 'line'
          sent_at: string
          status: 'success' | 'failed'
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          room_availability_id: string
          notification_type: 'email' | 'line'
          sent_at?: string
          status: 'success' | 'failed'
          error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          room_availability_id?: string
          notification_type?: 'email' | 'line'
          sent_at?: string
          status?: 'success' | 'failed'
          error_message?: string | null
        }
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
  }
}
