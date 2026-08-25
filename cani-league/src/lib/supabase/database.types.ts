export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string;
          name: string;
          season: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          season: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          season?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          short_name: string;
          owner_name: string | null;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          budget: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          name: string;
          short_name: string;
          owner_name?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          budget?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          name?: string;
          short_name?: string;
          owner_name?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          budget?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          short_name: string | null;
          photo_url: string | null;
          position: string;
          age: number | null;
          nationality: string | null;
          overall: number | null;
          speed: number | null;
          acceleration: number | null;
          shooting: number | null;
          passing: number | null;
          dribbling: number | null;
          defending: number | null;
          physical: number | null;
          market_value: number;
          transfer_price: number;
          available_in_market: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          short_name?: string | null;
          photo_url?: string | null;
          position: string;
          age?: number | null;
          nationality?: string | null;
          overall?: number | null;
          speed?: number | null;
          acceleration?: number | null;
          shooting?: number | null;
          passing?: number | null;
          dribbling?: number | null;
          defending?: number | null;
          physical?: number | null;
          market_value?: number;
          transfer_price?: number;
          available_in_market?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          short_name?: string | null;
          photo_url?: string | null;
          position?: string;
          age?: number | null;
          nationality?: string | null;
          overall?: number | null;
          speed?: number | null;
          acceleration?: number | null;
          shooting?: number | null;
          passing?: number | null;
          dribbling?: number | null;
          defending?: number | null;
          physical?: number | null;
          market_value?: number;
          transfer_price?: number;
          available_in_market?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      league_standings: {
        Row: {
          id: string;
          league_id: string;
          team_id: string;
          position: number;
          previous_position: number | null;
        };
        Insert: {
          id?: string;
          league_id: string;
          team_id: string;
          position: number;
          previous_position?: number | null;
        };
        Update: {
          id?: string;
          league_id?: string;
          team_id?: string;
          position?: number;
          previous_position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "league_standings_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_standings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          league_id: string;
          home_team_id: string;
          away_team_id: string;
          matchday: number;
          round: number;
          home_goals: number | null;
          away_goals: number | null;
          played: boolean;
          played_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          home_team_id: string;
          away_team_id: string;
          matchday: number;
          round?: number;
          home_goals?: number | null;
          away_goals?: number | null;
          played?: boolean;
          played_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          home_team_id?: string;
          away_team_id?: string;
          matchday?: number;
          round?: number;
          home_goals?: number | null;
          away_goals?: number | null;
          played?: boolean;
          played_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_home_team_id_fkey";
            columns: ["home_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_away_team_id_fkey";
            columns: ["away_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
