# Migrazioni Supabase

Cartella per lo schema del database, versionato come SQL (convenzione del
Supabase CLI). Attualmente vuota: è scaffolding in preparazione, lo schema
vero e proprio (tabelle partite/giocatori/decisioni/risultati + policy RLS)
è compito del **Backend Developer** / **Software Architect**, coerente con
`docs/02-architettura.md` (RLS su ogni tabella, deny-by-default).

## Convenzione

- Una migrazione per file, nome generato dal CLI:
  `supabase migration new <nome_breve>` → crea
  `supabase/migrations/<timestamp>_<nome_breve>.sql`.
- Mai modificare una migrazione già applicata in un ambiente condiviso:
  crearne una nuova che corregge la precedente.
- Ogni tabella nuova deve abilitare RLS nella stessa migrazione che la crea
  (`alter table ... enable row level security;`) insieme alle policy, non in
  un passo successivo — evita finestre in cui una tabella resta senza RLS.

## Flusso previsto

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>   # una tantum, per progetto
supabase migration new crea_schema_base
# ...scrivere la migrazione...
supabase db push                                      # applica al progetto collegato
```

Dettagli su login CLI e collegamento al progetto in
`docs/09-piattaforma-hosting.md`.
