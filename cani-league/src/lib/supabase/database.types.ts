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
      member_devices: {
        Row: { user_id: string; member_id: string; created_at: string; last_seen_at: string };
        Insert: { user_id: string; member_id: string; created_at?: string; last_seen_at?: string };
        Update: { member_id?: string; last_seen_at?: string };
        Relationships: [
          {
            foreignKeyName: "member_devices_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      league_invites: {
        Row: { code: string; created_at: string; created_by: string | null; revoked_at: string | null };
        Insert: { code: string; created_at?: string; created_by?: string | null; revoked_at?: string | null };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          team_id: string | null;
          is_admin: boolean;
          user_id: string | null;
          created_at: string;
          last_seen_at: string | null;
          onboarded_at: string | null;
          pin_hash: string | null;
          pin_failures: number;
          pin_locked_until: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          display_name: string;
          team_id?: string | null;
          is_admin?: boolean;
          user_id?: string | null;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          team_id?: string | null;
          is_admin?: boolean;
          user_id?: string | null;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          created_at: string;
          league_id: string | null;
          kind: string;
          team_id: string | null;
          other_team_id: string | null;
          player_id: string | null;
          title: string;
          amount: number | null;
          payload: Json;
          actor_id: string | null;
          actor_name: string | null;
          as_admin: boolean;
          private: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          league_id?: string | null;
          kind: string;
          team_id?: string | null;
          other_team_id?: string | null;
          player_id?: string | null;
          title: string;
          amount?: number | null;
          payload?: Json;
          actor_id?: string | null;
          actor_name?: string | null;
          as_admin?: boolean;
          private?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          activity_id: string | null;
          kind: string | null;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          activity_id?: string | null;
          kind?: string | null;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      match_goals: {
        Row: {
          id: string;
          league_id: string;
          season: string;
          match_id: string | null;
          cup_tie_id: string | null;
          leg: number | null;
          team_id: string;
          player_id: string | null;
          player_name: string;
          goals: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          season: string;
          match_id?: string | null;
          cup_tie_id?: string | null;
          leg?: number | null;
          team_id: string;
          player_id?: string | null;
          player_name: string;
          goals?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          season?: string;
          match_id?: string | null;
          cup_tie_id?: string | null;
          leg?: number | null;
          team_id?: string;
          player_id?: string | null;
          player_name?: string;
          goals?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cup_ties: {
        Row: {
          id: string;
          league_id: string;
          season: string;
          trophy: string;
          round: number;
          slot: number;
          is_final: boolean;
          home_team_id: string | null;
          away_team_id: string | null;
          leg1_home_goals: number | null;
          leg1_away_goals: number | null;
          leg2_home_goals: number | null;
          leg2_away_goals: number | null;
          penalty_winner_id: string | null;
          winner_team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          season: string;
          trophy: string;
          round: number;
          slot: number;
          is_final?: boolean;
          home_team_id?: string | null;
          away_team_id?: string | null;
          leg1_home_goals?: number | null;
          leg1_away_goals?: number | null;
          leg2_home_goals?: number | null;
          leg2_away_goals?: number | null;
          penalty_winner_id?: string | null;
          winner_team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          season?: string;
          trophy?: string;
          round?: number;
          slot?: number;
          is_final?: boolean;
          home_team_id?: string | null;
          away_team_id?: string | null;
          leg1_home_goals?: number | null;
          leg1_away_goals?: number | null;
          leg2_home_goals?: number | null;
          leg2_away_goals?: number | null;
          penalty_winner_id?: string | null;
          winner_team_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          league_id: string;
          season: string;
          standings: Json;
          champions: Json;
          top_scorers: Json;
          closed_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          season: string;
          standings?: Json;
          champions?: Json;
          top_scorers?: Json;
          closed_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          season?: string;
          standings?: Json;
          champions?: Json;
          top_scorers?: Json;
          closed_at?: string;
        };
        Relationships: [];
      };
      transfer_offers: {
        Row: {
          id: string;
          league_id: string;
          player_id: string;
          buyer_team_id: string;
          seller_team_id: string;
          amount: number;
          swap_player_id: string | null;
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          league_id: string;
          player_id: string;
          buyer_team_id: string;
          seller_team_id: string;
          amount?: number;
          swap_player_id?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          league_id?: string;
          player_id?: string;
          buyer_team_id?: string;
          seller_team_id?: string;
          amount?: number;
          swap_player_id?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      contract_salaries: {
        Row: {
          league_id: string;
          tier: string;
          percent: number;
          updated_at: string;
        };
        Insert: {
          league_id: string;
          tier: string;
          percent?: number;
          updated_at?: string;
        };
        Update: {
          league_id?: string;
          tier?: string;
          percent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      season_closures: {
        Row: {
          league_id: string;
          calendar_key: string;
          stage: string;
          created_at: string;
        };
        Insert: {
          league_id: string;
          calendar_key: string;
          stage: string;
          created_at?: string;
        };
        Update: {
          league_id?: string;
          calendar_key?: string;
          stage?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      contract_events: {
        Row: {
          id: string;
          league_id: string;
          calendar_key: string;
          team_id: string | null;
          player_id: string | null;
          player_name: string;
          team_name: string;
          kind: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          calendar_key: string;
          team_id?: string | null;
          player_id?: string | null;
          player_name: string;
          team_name: string;
          kind: string;
          amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          calendar_key?: string;
          team_id?: string | null;
          player_id?: string | null;
          player_name?: string;
          team_name?: string;
          kind?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      trophy_prizes: {
        Row: {
          league_id: string;
          trophy: string;
          prize: number;
          updated_at: string;
        };
        Insert: {
          league_id: string;
          trophy: string;
          prize?: number;
          updated_at?: string;
        };
        Update: {
          league_id?: string;
          trophy?: string;
          prize?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_trophies: {
        Row: {
          team_id: string;
          trophy: string;
          count: number;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          trophy: string;
          count?: number;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          trophy?: string;
          count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      transfers: {
  Row: {
    id: string;
    league_id: string;
    player_id: string;
    player_name: string;
    from_team_id: string | null;
    from_team_name: string | null;
    to_team_id: string | null;
    to_team_name: string | null;
    fee: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    league_id: string;
    player_id: string;
    player_name: string;
    from_team_id?: string | null;
    from_team_name?: string | null;
    to_team_id?: string | null;
    to_team_name?: string | null;
    fee: number;
    created_at?: string;
  };
  Update: {
    id?: string;
    league_id?: string;
    player_id?: string;
    player_name?: string;
    from_team_id?: string | null;
    from_team_name?: string | null;
    to_team_id?: string | null;
    to_team_name?: string | null;
    fee?: number;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "transfers_league_id_fkey";
      columns: ["league_id"];
      isOneToOne: false;
      referencedRelation: "leagues";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "transfers_player_id_fkey";
      columns: ["player_id"];
      isOneToOne: false;
      referencedRelation: "players";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "transfers_from_team_id_fkey";
      columns: ["from_team_id"];
      isOneToOne: false;
      referencedRelation: "teams";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "transfers_to_team_id_fkey";
      columns: ["to_team_id"];
      isOneToOne: false;
      referencedRelation: "teams";
      referencedColumns: ["id"];
    },
  ];
};
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
          contract_seasons_left: number | null;
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
          contract_seasons_left?: number | null;
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
          contract_seasons_left?: number | null;
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
          season: string | null;
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
          season?: string | null;
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
          season?: string | null;
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
    Functions: {
      is_invited: { Args: { p_email: string }; Returns: boolean };
      is_member: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      my_team_id: { Args: Record<string, never>; Returns: string | null };
      is_valid_invite: { Args: { p_code: string }; Returns: boolean };
      join_with_code: { Args: { p_email: string; p_code: string }; Returns: boolean };
      new_invite_code: { Args: Record<string, never>; Returns: string };
      complete_profile: {
        Args: { p_name: string | null; p_team: string | null };
        Returns: Database["public"]["Tables"]["members"]["Row"];
      };
      current_member_id: { Args: Record<string, never>; Returns: string | null };
      entry_clubs: { Args: Record<string, never>; Returns: { team_id: string; owner_name: string }[] };
      join_club: {
        Args: { p_team: string; p_name: string | null; p_code?: string | null };
        Returns: Database["public"]["Tables"]["members"]["Row"];
      };
      remove_member_devices: { Args: { p_member: string }; Returns: number };
      claim_membership: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["members"]["Row"] | null;
      };
      log_app_event: {
        Args: {
          p_kind: string;
          p_team: string | null;
          p_amount: number | null;
          p_title: string;
          p_payload?: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
