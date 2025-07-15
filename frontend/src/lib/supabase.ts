import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          total_wins: number;
          total_losses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          total_wins?: number;
          total_losses?: number;
        };
        Update: {
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          total_wins?: number;
          total_losses?: number;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          duration_hours: number;
          points: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          duration_hours: number;
          points: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          duration_hours?: number;
          points?: number;
          is_active?: boolean;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completion_date: string;
          actual_duration_hours: number;
          earned_points: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          task_id: string;
          completion_date: string;
          actual_duration_hours: number;
          earned_points: number;
        };
        Update: {
          actual_duration_hours?: number;
          earned_points?: number;
        };
      };
      challenges: {
        Row: {
          id: string;
          creator_id: string;
          challenger_id: string;
          start_date: string;
          end_date: string;
          status: 'pending' | 'active' | 'completed' | 'cancelled';
          winner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          creator_id: string;
          challenger_id: string;
          start_date: string;
          end_date: string;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
        };
        Update: {
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          winner_id?: string | null;
        };
      };
      daily_scores: {
        Row: {
          id: string;
          user_id: string;
          score_date: string;
          total_possible_points: number;
          earned_points: number;
          percentage_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          score_date: string;
          total_possible_points: number;
          earned_points: number;
          percentage_score: number;
        };
        Update: {
          total_possible_points?: number;
          earned_points?: number;
          percentage_score?: number;
        };
      };
    };
  };
};