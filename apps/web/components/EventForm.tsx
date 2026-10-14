"use client";
import { useActionState, useMemo, useState } from "react";
import { parseGuests, tableCount, priceCents, KIND_LABEL } from "@ceremonia/core";
import { readGuestFile } from "@/lib/client/readGuestFile";
import { TYPES, titleOf, money } from "@/lib/format";
import type { ActionState } from "@/components/ConfirmAction";

type Initial = Partial<Record<"type" | "host_a" | "host_b" | "title" | "event_date" | "event_time" | "venue" | "address" | "dress" | "message" | "program" | "offer" | "phone_prefix", string>> & { expected?: number; table_capacity?: number };

/** Formulaire d'événement : création (avec listes et invités) ou modification. */
export function EventForm({ action, initial, eventId, unit }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; initial?: Initial; eventId?: string; unit?: { cents: number; persons: number; currency: string } }) {
  const creating = !eventId;
  const [state, run, pending] = useActionState<ActionState, FormData>(action, null);
  const [type, setType] = useState(initial?.type || "mariage");
  const T = TYPES[type];
  const [a, setA] = useState(initial?.host_a || "");
  const [b, setB] = useState(initial?.host_b || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [titleEdited, setTitleEdited] = useState(!!initial?.title);
  const [message, setMessage] = useState(initial?.message ?? T.msg);
  const [program, setProgram] = useState(initial?.program ?? T.prog);
  const [textEdited, setTextEdited] = useState(!creating);
  const [cap, setCap] = useState(initial?.table_capacity ?? T.cap);
  const [expected, setExpected] = useState(initial?.expected ?? 0);
  const [prefix, setPrefix] = useState(initial?.phone_prefix || "+243");
  const [offer, setOffer] = useState(initial?.offer || "both");
  const [guests, setGuests] = useState("");
  const [fileErr, setFileErr] = useState("");
  const parsed = useMemo(() => (guests.trim() ? parseGuests(guests, prefix) : null), [guests, prefix]);
  const persons = parsed ? parsed.rows.reduce((s, r) => s + (r.kind === "couple" ? 2 : 1), 0) : 0;
  const tc = cap > 0 ? tableCount({ table_capacity: cap, expected, extra_tables: 0 }, parsed ? parsed.rows.map((r) => ({ kind: r.kind || null })) : []) : 0;
  const shownTitle = titleEdited ? title : titleOf(type, a, b);

  function pickType(t: string) {
    setType(t);
    if (!textEdited) { setMessage(TYPES[t].msg); setProgram(TYPES[t].prog); }
    if (creating) setCap(TYPES[t].cap);
  }

  return (
    <form action={run} className="form" style={{ maxWidth: 860 }}>
      {eventId && <input type="hidden" name="event_id" value={eventId} />}
      <section className="card form">
        <h2>L’événement</h2>
        <div className="fld"><label htmlFor="type">Type</label>
          <select id="type" name="type" value={type} onChange={(e) => pickType(e.target.value)}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="grid g2">
          <div className="fld"><label htmlFor="host_a">{T.a}</label><input id="host_a" name="host_a" maxLength={80} value={a} onChange={(e) => setA(e.target.value)} /></div>
          {T.b ? <div className="fld"><label htmlFor="host_b">{T.b}</label><input id="host_b" name="host_b" maxLength={80} value={b} onChange={(e) => setB(e.target.value)} /></div> : <input type="hidden" name="host_b" value="" />}
        </div>
        <div className="fld"><label htmlFor="title">Titre affiché sur l’invitation</label>
          <input id="title" name="title" required maxLength={160} value={shownTitle} onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }} placeholder="Patrick & Grâce" /></div>
        <div className="grid g2">
          <div className="fld"><label htmlFor="event_date">Date</label><input id="event_date" name="event_date" type="date" required defaultValue={initial?.event_date} /></div>
          <div className="fld"><label htmlFor="event_time">Heure</label><input id="event_time" name="event_time" type="time" required defaultValue={(initial?.event_time || "16:00").slice(0, 5)} /></div>
        </div>
      </section>

      <section className="card form">
        <h2>Le lieu</h2>
        <div className="fld"><label htmlFor="venue">Nom du lieu</label><input id="venue" name="venue" required maxLength={160} defaultValue={initial?.venue} placeholder="Salle Le Prestige" /></div>
        <div className="fld"><label htmlFor="address">Adresse</label><input id="address" name="address" required maxLength={300} defaultValue={initial?.address} placeholder="Boulevard du 30 Juin, Gombe, Kinshasa" /></div>
        <div className="fld"><label htmlFor="dress">Tenue (facultatif)</label><input id="dress" name="dress" maxLength={160} defaultValue={initial?.dress} placeholder="Tenue de soirée" /></div>
      </section>

      <section className="card form">
        <h2>Les tables</h2>
        <div className="grid g3">
          <div className="fld"><label htmlFor="table_capacity">Places par table</label><input id="table_capacity" name="table_capacity" type="number" inputMode="numeric" min={1} max={100} value={cap} onChange={(e) => setCap(Number(e.target.value))} required /></div>
          <div className="fld"><label htmlFor="expected">Personnes attendues (facultatif)</label><input id="expected" name="expected" type="number" inputMode="numeric" min={0} max={10000} value={expected} onChange={(e) => setExpected(Number(e.target.value))} /></div>
          <div className="fld"><label htmlFor="phone_prefix">Indicatif WhatsApp par défaut</label><input id="phone_prefix" name="phone_prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={5} required /></div>
        </div>
        <p className="hint">{cap > 0 ? `${tc} table(s) de ${cap} places. Un couple occupe toujours 2 places à la même table.` : "Indiquez le nombre de places par table."}</p>
      </section>

      <section className="card form">
        <h2>Boissons et buffet</h2>
        <div className="fld"><label htmlFor="offer">Ce que les invités choisissent</label>
          <select id="offer" name="offer" value={offer} onChange={(e) => setOffer(e.target.value)}>
            <option value="both">Une boisson et un plat par personne</option><option value="drinks">Une boisson par personne</option><option value="food">Un plat par personne</option><option value="none">Rien à choisir</option>
          </select>
        </div>
        {creating ? (
          <div className="grid g2">
            {(offer === "both" || offer === "drinks") && <div className="fld"><label htmlFor="drinks">Boissons proposées (une par ligne)</label><textarea id="drinks" name="drinks" placeholder={"Coca-Cola\nFanta\nPrimus\nEau minérale"} /></div>}
            {(offer === "both" || offer === "food") && <div className="fld"><label htmlFor="dishes">Plats proposés (un par ligne)</label><textarea id="dishes" name="dishes" placeholder={"Poulet braisé\nPoisson\nPlat végétarien"} /></div>}
          </div>
        ) : <p className="hint">Les listes se modifient dans les rubriques Boissons et Buffet.</p>}
      </section>

      <section className="card form">
        <h2>Message et programme</h2>
        <div className="fld"><label htmlFor="message">Message aux invités</label><textarea id="message" name="message" maxLength={2000} value={message} onChange={(e) => { setMessage(e.target.value); setTextEdited(true); }} /></div>
        <div className="fld"><label htmlFor="program">Programme (« heure | activité », une ligne chacune)</label><textarea id="program" name="program" maxLength={3000} value={program} onChange={(e) => { setProgram(e.target.value); setTextEdited(true); }} style={{ minHeight: 130 }} /></div>
      </section>

      {creating && (
        <section className="card form">
          <h2>Les invités (facultatif)</h2>
          <p className="hint">Une invitation par ligne : Nom ; Statut ; WhatsApp. Collez une liste ou importez un fichier Excel (.xlsx) ou CSV. Vous pourrez aussi les ajouter plus tard.</p>
          <div className="fld"><label htmlFor="guests">Liste</label><textarea id="guests" name="guests" value={guests} onChange={(e) => setGuests(e.target.value)} style={{ minHeight: 150 }} placeholder={"Mr Luc Mbuyi ; Monsieur ; 081 000 0001\nCouple Bola ; Couple ; +243 81 000 0002\nMme Lucie ; Madame"} /></div>
          <div className="row">
            <label className="btn ghost sm" style={{ position: "relative" }}>Importer un fichier
              <input type="file" accept=".xlsx,.csv,.txt,.tsv" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setFileErr(""); try { setGuests(await readGuestFile(f)); } catch (er) { setFileErr((er as Error).message); } }} />
            </label>
            {fileErr && <span className="badge bad">{fileErr}</span>}
          </div>
          {parsed && (
            <div className={"notice " + (parsed.rows.length ? "ok" : "bad")}>
              <b>{parsed.rows.length} invitation(s)</b> · {persons} personne(s)
              {parsed.rows.slice(0, 4).map((r, i) => <div key={i} className="hint">{r.name} · {r.kind ? KIND_LABEL[r.kind] : "statut à préciser"}{r.whatsapp ? " · " + r.whatsapp : ""}</div>)}
              {parsed.issues.length > 0 && <div className="hint" style={{ color: "var(--warn)" }}>{parsed.issues.length} remarque(s) : {parsed.issues.slice(0, 3).join(" ")}</div>}
            </div>
          )}
          <label className="check"><input type="checkbox" name="auto" defaultChecked /> Placer automatiquement les invités à table</label>
          {unit && <p className="hint">Tarif : {money(unit.cents, unit.currency)} par tranche de {unit.persons} personnes. Estimation actuelle : <b>{money(priceCents(Math.max(persons, expected), unit.cents, unit.persons), unit.currency)}</b>. Le règlement se fait depuis l’accueil de l’événement, avant l’envoi des invitations.</p>}
        </section>
      )}

      {state?.message && <div className={"notice " + (state.ok ? "ok" : "bad")} role="alert">{state.message}</div>}
      <div className="row"><button className="btn" type="submit" disabled={pending}>{pending ? "Enregistrement…" : creating ? "Créer l’événement" : "Enregistrer les modifications"}</button></div>
    </form>
  );
}
