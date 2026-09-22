import { Type, type FunctionDeclaration } from "@google/genai";
import { createStaticClient } from "@/lib/supabase/server";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_teams",
    description: "Obtiene la lista de todos los equipos participantes en la Cani League, junto con su presupuesto actual, nombre de su presidente/mánager y nombre corto.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_standings",
    description: "Obtiene la tabla de clasificación actual de la liga (posiciones, puntos, partidos jugados, victorias, empates, derrotas, goles a favor y en contra).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "search_players",
    description: "Busca y filtra jugadores en la base de datos de la Cani League. Permite filtrar por nombre, posición (CF, SS, LWF, RWF, AMF, CMF, DMF, CB, LB, RB, GK), si están transferibles en el mercado, precio máximo, media general (overall) mínima y ordenar por atributos clave de PES 6.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Nombre o fragmento del nombre del jugador a buscar",
        },
        position: {
          type: Type.STRING,
          description: "Posición táctica (ej: 'CF', 'SS', 'AMF', 'CMF', 'DMF', 'CB', 'LB', 'RB', 'GK')",
        },
        market_only: {
          type: Type.BOOLEAN,
          description: "Si es true, solo busca jugadores que estén transferibles / disponibles en el mercado actualmente",
        },
        max_price: {
          type: Type.INTEGER,
          description: "Precio o valor máximo en euros (ej: 20000000 para 20M€)",
        },
        min_overall: {
          type: Type.INTEGER,
          description: "Media (Overall) mínima del jugador (de 0 a 100)",
        },
        sort_by: {
          type: Type.STRING,
          description: "Criterio de ordenación: 'overall', 'speed', 'acceleration', 'shooting', 'passing', 'dribbling', 'defending', 'market_value', 'transfer_price'",
        },
        limit: {
          type: Type.INTEGER,
          description: "Cantidad máxima de jugadores a devolver (por defecto 10, máximo 20)",
        },
      },
    },
  },
  {
    name: "get_team_roster",
    description: "Obtiene la plantilla completa de un equipo específico con todos sus futbolistas, edades, posiciones, media (overall), precios y si están en el mercado.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        team_name_or_id: {
          type: Type.STRING,
          description: "Nombre del equipo (ej: 'Los Canis', 'Cani 401') o UUID del equipo",
        },
      },
      required: ["team_name_or_id"],
    },
  },
  {
    name: "get_calendar_fixtures",
    description: "Obtiene los partidos de la liga, calendarios, resultados jugados y próximos enfrentamientos por jornada o vuelta.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        matchday: {
          type: Type.INTEGER,
          description: "Número específico de jornada (opcional)",
        },
        round: {
          type: Type.INTEGER,
          description: "Vuelta: 1 para ida, 2 para vuelta (opcional)",
        },
      },
    },
  },
  {
    name: "get_recent_transfers",
    description: "Obtiene el historial de los traspasos y fichajes más recientes completados en la liga entre equipos.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.INTEGER,
          description: "Número de fichajes a devolver (por defecto 10)",
        },
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, any> = {}
): Promise<any> {
  const supabase = createStaticClient();

  try {
    switch (name) {
      case "get_teams": {
        const { data, error } = await supabase
          .from("teams")
          .select("id, name, short_name, owner_name, budget, primary_color")
          .order("name", { ascending: true });

        if (error) throw error;
        // Filtrar equipos del sistema / libres
        const validTeams = (data || []).filter(
          (t) =>
            !t.name.toLowerCase().includes("libre") &&
            !t.name.toLowerCase().includes("sin equipo")
        );
        return {
          count: validTeams.length,
          teams: validTeams.map((t) => ({
            id: t.id,
            name: t.name,
            short_name: t.short_name,
            owner: t.owner_name || "Sin mánager asignado",
            budget: t.budget,
            budget_formatted: `${(t.budget / 1_000_000).toFixed(1)}M€`,
          })),
        };
      }

      case "get_standings": {
        // Obtenemos los partidos jugados y los equipos para calcular o leer la tabla
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name, short_name")
          .order("name");

        const playableTeams = (teamsData || []).filter(
          (t) =>
            !t.name.toLowerCase().includes("libre") &&
            !t.name.toLowerCase().includes("sin equipo")
        );

        const { data: standingsData } = await supabase
          .from("league_standings")
          .select("position, previous_position, team_id, team:teams(id, name, short_name)")
          .order("position", { ascending: true });

        if (standingsData && standingsData.length > 0) {
          return {
            standings: standingsData.map((s: any) => ({
              position: s.position,
              team: s.team?.name || "Equipo",
              short_name: s.team?.short_name || "",
            })),
          };
        }

        // Si no hay standings manuales, calculamos con matches
        const { data: matches } = await supabase
          .from("matches")
          .select("home_team_id, away_team_id, home_goals, away_goals, played")
          .eq("played", true);

        type TableRow = {
          team_id: string;
          name: string;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          gf: number;
          ga: number;
          gd: number;
          pts: number;
        };

        const map = new Map<string, TableRow>();
        for (const t of playableTeams) {
          map.set(t.id, {
            team_id: t.id,
            name: t.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          });
        }

        for (const m of matches || []) {
          const home = map.get(m.home_team_id);
          const away = map.get(m.away_team_id);
          if (!home || !away) continue;
          const hg = m.home_goals ?? 0;
          const ag = m.away_goals ?? 0;

          home.played++;
          away.played++;
          home.gf += hg;
          home.ga += ag;
          away.gf += ag;
          away.ga += hg;

          if (hg > ag) {
            home.won++;
            home.pts += 3;
            away.lost++;
          } else if (hg < ag) {
            away.won++;
            away.pts += 3;
            home.lost++;
          } else {
            home.drawn++;
            home.pts += 1;
            away.drawn++;
            away.pts += 1;
          }
        }

        const table = Array.from(map.values())
          .map((row) => ({ ...row, gd: row.gf - row.ga }))
          .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
          .map((row, idx) => ({ position: idx + 1, ...row }));

        return { standings: table };
      }

      case "search_players": {
        const {
          query,
          position,
          market_only,
          max_price,
          min_overall,
          sort_by = "overall",
          limit = 10,
        } = args;

        let dbQuery = supabase
          .from("players")
          .select(
            "id, name, short_name, position, age, nationality, overall, speed, acceleration, shooting, passing, dribbling, defending, physical, market_value, transfer_price, available_in_market, team:teams(id, name, short_name)"
          );

        if (query) {
          dbQuery = dbQuery.ilike("name", `%${query}%`);
        }
        if (position) {
          dbQuery = dbQuery.eq("position", position.toUpperCase());
        }
        if (market_only) {
          dbQuery = dbQuery.eq("available_in_market", true);
        }
        if (max_price != null) {
          dbQuery = dbQuery.lte("market_value", max_price);
        }
        if (min_overall != null) {
          dbQuery = dbQuery.gte("overall", min_overall);
        }

        const allowedSorts = [
          "overall",
          "speed",
          "acceleration",
          "shooting",
          "passing",
          "dribbling",
          "defending",
          "market_value",
          "transfer_price",
        ];
        const validSort = allowedSorts.includes(sort_by) ? sort_by : "overall";
        dbQuery = dbQuery.order(validSort, { ascending: false }).limit(Math.min(limit, 20));

        const { data, error } = await dbQuery;
        if (error) throw error;

        return {
          total: data?.length || 0,
          players: (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            team: p.team?.name || "Sin equipo",
            position: p.position,
            age: p.age,
            nationality: p.nationality,
            overall: p.overall,
            stats: {
              vel: p.speed,
              ace: p.acceleration,
              dis: p.shooting,
              pas: p.passing,
              reg: p.dribbling,
              def: p.defending,
              fis: p.physical,
            },
            market_value: p.market_value,
            market_value_formatted: `${(p.market_value / 1_000_000).toFixed(1)}M€`,
            transfer_price: p.transfer_price,
            transfer_price_formatted: `${(p.transfer_price / 1_000_000).toFixed(1)}M€`,
            available_in_market: p.available_in_market,
          })),
        };
      }

      case "get_team_roster": {
        const { team_name_or_id } = args;
        if (!team_name_or_id) {
          return { error: "Debes especificar el nombre o id del equipo." };
        }

        // Buscar equipo primero
        let { data: team } = await supabase
          .from("teams")
          .select("*")
          .eq("id", team_name_or_id)
          .maybeSingle();

        if (!team) {
          const { data: teamsMatch } = await supabase
            .from("teams")
            .select("*")
            .ilike("name", `%${team_name_or_id}%`)
            .limit(1);
          team = teamsMatch?.[0] || null;
        }

        if (!team) {
          return { error: `No se encontró ningún equipo llamado '${team_name_or_id}'` };
        }

        const { data: players, error } = await supabase
          .from("players")
          .select("*")
          .eq("team_id", team.id)
          .order("overall", { ascending: false });

        if (error) throw error;

        return {
          team: {
            id: team.id,
            name: team.name,
            short_name: team.short_name,
            owner: team.owner_name,
            budget: team.budget,
            budget_formatted: `${(team.budget / 1_000_000).toFixed(1)}M€`,
          },
          squad_size: players?.length || 0,
          players: (players || []).map((p) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            age: p.age,
            overall: p.overall,
            market_value_formatted: `${(p.market_value / 1_000_000).toFixed(1)}M€`,
            available_in_market: p.available_in_market,
            speed: p.speed,
            shooting: p.shooting,
            passing: p.passing,
            defending: p.defending,
          })),
        };
      }

      case "get_calendar_fixtures": {
        const { matchday, round } = args;
        let query = supabase
          .from("matches")
          .select(
            "id, matchday, round, home_goals, away_goals, played, home_team:teams!matches_home_team_id_fkey(name, short_name), away_team:teams!matches_away_team_id_fkey(name, short_name)"
          )
          .order("matchday", { ascending: true });

        if (matchday != null) query = query.eq("matchday", matchday);
        if (round != null) query = query.eq("round", round);

        const { data, error } = await query;
        if (error) throw error;

        return {
          matches: (data || []).map((m: any) => ({
            id: m.id,
            matchday: m.matchday,
            round: m.round === 1 ? "Ida" : "Vuelta",
            home: m.home_team?.name || "Local",
            away: m.away_team?.name || "Visitante",
            result: m.played ? `${m.home_goals} - ${m.away_goals}` : "Pendiente",
            played: m.played,
          })),
        };
      }

      case "get_recent_transfers": {
        const { limit = 10 } = args;
        const { data, error } = await supabase
          .from("transfers")
          .select("id, player_name, from_team_name, to_team_name, fee, created_at")
          .order("created_at", { ascending: false })
          .limit(Math.min(limit, 20));

        if (error) {
          // Si la tabla transfers aún no tiene filas o falla, devolvemos array vacío
          return { transfers: [] };
        }

        return {
          transfers: ((data as any[]) || []).map((t: any) => ({
            player: t.player_name,
            from: t.from_team_name,
            to: t.to_team_name,
            fee_formatted: `${(t.fee / 1_000_000).toFixed(1)}M€`,
            date: t.created_at,
          })),
        };
      }

      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (err: any) {
    return { error: `Error ejecutando ${name}: ${err.message || String(err)}` };
  }
}
