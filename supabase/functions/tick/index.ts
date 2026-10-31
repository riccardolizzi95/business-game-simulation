// supabase/functions/tick/index.ts
//
// PLACEHOLDER — Edge Function del "tick trimestrale" (Deno, runtime Supabase).
//
// Cosa farà (implementazione a cura del Backend Developer, vedi
// docs/02-architettura.md e docs/09-piattaforma-hosting.md):
//   1. Autenticare la chiamata (vedi sotto) — solo lo scheduler deve poterla invocare.
//   2. Per ogni partita con un turno in scadenza:
//      - leggere le decisioni di tutti i giocatori dal DB (Postgres/Supabase);
//      - eseguire il game-engine (funzione pura e deterministica) per calcolare i risultati;
//      - scrivere i risultati e aprire il turno successivo, in una transazione.
//   3. Non fidarsi di alcun input proveniente dal client in questa funzione:
//      opera solo sui dati già validati e persistiti dal server al momento della decisione.
//
// NOTA ARCHITETTURALE APERTA (da chiudere con Software Architect, eventuale ADR):
// il game-engine oggi vive in apps/web/src/lib/game-engine (TypeScript per Next.js),
// mentre questa funzione gira su Deno. docs/02-architettura.md prevede di estrarlo
// in packages/game-engine come libreria pura condivisa — quel pacchetto non esiste
// ancora. Finché non viene creato, questa funzione NON può importare la logica di
// simulazione reale. Non duplicare la logica qui: bloccante da risolvere prima di
// implementare il tick sul serio.
//
// Sicurezza: questa funzione ha `verify_jwt = false` (vedi supabase/config.toml)
// perché non viene chiamata da un utente loggato ma da uno scheduler (cron
// Supabase via pg_cron/pg_net, oppure un cron esterno). Per questo DEVE verificare
// da sola un segreto condiviso letto da env (TICK_CRON_SECRET), mai hardcoded.
//
// Questo file è volutamente un placeholder inerte: risponde solo a un controllo
// di salute/autenticazione, non tocca il database. Nessun segreto reale è
// presente: TICK_CRON_SECRET viene letto solo da variabile d'ambiente a runtime
// (Supabase → Project Settings → Edge Functions → Secrets), mai dal repo.

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("TICK_CRON_SECRET");
  const provided = req.headers.get("x-tick-secret");

  if (!expected) {
    // Segreto non configurato nell'ambiente: rifiuta per sicurezza (fail-closed),
    // non eseguire mai il tick senza un segreto impostato.
    return new Response(
      JSON.stringify({ ok: false, error: "TICK_CRON_SECRET non configurato" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  if (provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "non autorizzato" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // TODO(backend-developer): sostituire con l'elaborazione reale del turno.
  return new Response(
    JSON.stringify({
      ok: true,
      note: "placeholder: nessuna partita elaborata, logica non ancora implementata",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});
