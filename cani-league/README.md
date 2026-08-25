# Cani League Manager

Aplicación web privada para gestionar una liga de PES 6 / Cani Patch.

## Stack

- Next.js + TypeScript + Tailwind CSS
- **shadcn/ui** (Radix Nova) — Button, Card, Dialog, Sheet, Select…
- Supabase (PostgreSQL)
- dnd-kit (clasificación drag & drop)
- Lucide React

Añadir componentes:

```bash
npx shadcn@latest add [component]
```

## Setup

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En el SQL Editor, ejecuta en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/seed.sql`
3. Copia el entorno:

```bash
cp .env.local.example .env.local
```

4. Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Arranca:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → redirige a `/league`.

## Estructura

```
src/
  app/           # Rutas (league, teams, players, market, standings, finances)
  components/    # UI reutilizable
  constants/     # Posiciones, nav, labels
  lib/
    data/        # Acceso a datos + mutaciones
    format/      # formatMoney, stats
    supabase/    # Clientes tipados
    validations/ # Zod
  types/         # League, Team, Player, Standing
supabase/
  migrations/    # Schema
  seed.sql       # Cani League 2026 + 7 equipos
```

## Notas de arquitectura

- El número de equipos es **data-driven** (nunca hardcodeado a 7).
- Dinero en **INTEGER euros**.
- Clasificación **manual** vía `league_standings` (lista para auto-cálculo futuro).
- RLS abierto en MVP; listo para auth después.
