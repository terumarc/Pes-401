import pesStatsData from "@/data/pes_stats.json";
import { PES_STAT_DEFINITIONS } from "@/constants/pes";
import type { PesStats, Player } from "@/types";

const typedPesStats = pesStatsData as Record<string, number[]>;

export function getPesStats(playerId: string): PesStats | null {
  const arr = typedPesStats[playerId];
  if (!arr || arr.length < 26) {
    return null;
  }

  const result: Partial<PesStats> = {};
  PES_STAT_DEFINITIONS.forEach((def, index) => {
    result[def.key] = arr[index] ?? 50;
  });

  return result as PesStats;
}

export function getOrEstimatePesStats(player: Player): PesStats {
  const exact = getPesStats(player.id);
  if (exact) return exact;

  const spd = player.speed ?? 65;
  const acc = player.acceleration ?? 65;
  const sho = player.shooting ?? 65;
  const pas = player.passing ?? 65;
  const dri = player.dribbling ?? 65;
  const def = player.defending ?? 65;
  const phy = player.physical ?? 65;
  const ovr = player.overall ?? 65;

  return {
    attack: sho,
    defense: def,
    balance: phy,
    stamina: phy,
    top_speed: spd,
    acceleration: acc,
    response: Math.round((def + acc) / 2),
    agility: Math.round((dri + acc) / 2),
    dribble_accuracy: dri,
    dribble_speed: Math.round((dri + spd) / 2),
    short_pass_accuracy: pas,
    short_pass_speed: pas,
    long_pass_accuracy: pas,
    long_pass_speed: pas,
    shot_accuracy: sho,
    shot_power: sho,
    shot_technique: sho,
    free_kick_accuracy: Math.round((sho + pas) / 2),
    swerve: pas,
    heading: Math.round((phy + sho) / 2),
    jump: phy,
    technique: dri,
    aggression: Math.round((phy + def) / 2),
    mentality: ovr,
    goal_keeping: player.position === "GK" ? ovr : 50,
    team_work: pas,
  };
}
