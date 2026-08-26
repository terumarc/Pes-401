export type League = {
  id: string;
  name: string;
  season: string;
  created_at: string;
};

export type Team = {
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

export type PlayerPosition =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "DMF"
  | "CMF"
  | "AMF"
  | "LMF"
  | "RMF"
  | "LWF"
  | "RWF"
  | "SS"
  | "CF";

export type Player = {
  id: string;
  team_id: string;
  name: string;
  short_name: string | null;
  photo_url: string | null;
  position: PlayerPosition | string;
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

export type Standing = {
  id: string;
  league_id: string;
  team_id: string;
  position: number;
  previous_position: number | null;
};

export type TeamWithStanding = Team & {
  position: number;
  previous_position: number | null;
  player_count?: number;
  avg_overall?: number;
  squad_value?: number;
  top_player?: { name: string; overall: number };
};

export type PlayerWithTeam = Player & {
  team: Pick<Team, "id" | "name" | "short_name" | "primary_color" | "logo_url">;
};

export type StandingWithTeam = Standing & {
  team: Team;
};

export type TeamUpdateInput = {
  name?: string;
  short_name?: string;
  owner_name?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  budget?: number;
};

export type PlayerCreateInput = {
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
};

export type PlayerUpdateInput = Partial<PlayerCreateInput>;

export type Match = {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  matchday: number;
  round: number; // 1 = ida, 2 = vuelta
  home_goals: number | null;
  away_goals: number | null;
  played: boolean;
  played_at: string | null;
  created_at: string;
};

export type MatchWithTeams = Match & {
  home_team: Pick<Team, "id" | "name" | "short_name" | "primary_color" | "logo_url">;
  away_team: Pick<Team, "id" | "name" | "short_name" | "primary_color" | "logo_url">;
};

export type LeagueTableRow = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};
