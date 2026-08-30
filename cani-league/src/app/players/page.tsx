
export default function PlayersPage({ searchParams }: Props) {
  const [data, setData] = useState<any>(null);
  const [params, setParams] = useState<any>(null);
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      const p = await searchParams;
      setParams(p);
      
      if (!isSupabaseConfigured()) {
        setData({ status: "setup" });
        return;
      }

      const league = await getPrimaryLeague();
      if (!league) {
        setData({ status: "no-league" });
        return;
      }

      const [players, teams] = await Promise.all([
        getPlayers(),
        getTeamsByLeague(league.id),
      ]);
      setData({ players, teams });
    }
    fetchData();
  }, [searchParams]);

  if (!data) return null;
  if (data.status === "setup") return <SetupNotice />;
  if (data.status === "no-league") return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const { players, teams } = data;
  const leaguePlayers = players.filter((p: any) =>
    teams.some((t: any) => t.id === p.team_id),
  );

  const searchQuery = searchParamsHook.get("q")?.toLowerCase() ?? "";
  const filteredPlayers = leaguePlayers.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery) ||
    (p.position?.toLowerCase().includes(searchQuery) ?? false)
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Plantilla global"
        title="Jugadores"
        description={`${filteredPlayers.length} jugadores registrados`}
        actions={
          <>
            <Input
              placeholder="Buscar jugador…"
              defaultValue={searchQuery}
              onChange={(e) => {
                const url = new URL(window.location.href);
                if (e.target.value) {
                  url.searchParams.set("q", e.target.value);
                } else {
                  url.searchParams.delete("q");
                }
                router.replace(url.pathname + url.search);
              }}
              className="mr-2 w-64"
            />
            <Button asChild>
              <Link href="/players?new=1">Nuevo jugador</Link>
            </Button>
          </>
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={params?.new === "1"}
        defaultTeamId={params?.team}
      />

      <div className="mt-6 grid gap-3">
        {filteredPlayers.map((player: any) => (
          <PlayerCard
            key={player.id}
            player={player}
            href={`/players/${player.id}`}
          />
        ))}
        {filteredPlayers.length === 0 && (
          <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            No hay jugadores que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
