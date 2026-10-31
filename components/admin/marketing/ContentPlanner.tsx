"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  approvePlanDraftsAction,
  createContentPlanAction,
  deleteContentPlanAction,
  generateContentIdeasAction,
  generatePlanDraftsAction,
  saveContentPreferencesAction,
} from "@/actions/admin/marketing-planner";
import type { ContentPlanRow, ContentPreferenceState } from "@/lib/marketing/content-planner";
import {
  CHANNEL_LABELS,
  FORMAT_LABELS,
  OBJECTIVE_LABELS,
  PILLAR_LABELS,
  PILLARS,
  FORMATS,
  OBJECTIVES,
  CHANNELS,
} from "@/lib/marketing/content-labels";

/**
 * Content planner (phase 5).
 *
 * Three blocks:
 *  1. Preferences — the automatable rules (pillars, formats, objectives,
 *     hours, forbidden topics) that the AI and the scheduler follow.
 *  2. Calendar — the slots of the week (manually added or proposed by AI).
 *  3. Generation — turns the planned slots into real post drafts with copy,
 *     media and schedule, ready to be reviewed and published by the queue.
 */

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function ContentPlanner({
  preferences,
  plan,
  days,
  products,
}: {
  preferences: ContentPreferenceState;
  plan: ContentPlanRow[];
  days: string[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  // Preferences draft state (kept local until "Guardar preferencias").
  const [draft, setDraft] = useState<ContentPreferenceState>(preferences);

  // New-slot form state.
  const [slot, setSlot] = useState({
    date: days[0] ?? "",
    time: preferences.bestHours[0] ?? "11:00",
    channel: "instagram",
    pillar: preferences.pillars[0] ?? "proceso",
    format: preferences.formats[0] ?? "post",
    objective: preferences.objectives[0] ?? "alcance",
    idea: "",
    productId: "",
  });

  const planByDay = useMemo(() => {
    const map = new Map<string, ContentPlanRow[]>();
    for (const day of days) map.set(day, []);
    for (const row of plan) {
      const list = map.get(row.date);
      if (list) list.push(row);
    }
    return map;
  }, [plan, days]);

  const run = async (key: string, task: () => Promise<{ ok: boolean; error?: string }>) => {
    setMessage(null);
    setBusy(key);
    try {
      const result = await task();
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error ?? "No se pudo completar" });
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMessage({ kind: "error", text: "Error de conexión. Reintentá." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const savePreferences = () =>
    run("prefs", async () => {
      const result = await saveContentPreferencesAction(draft);
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: "Preferencias guardadas. La IA y el planificador las usan desde ahora.",
        });
      }
      return result;
    });

  const addSlot = () =>
    run("slot", async () => {
      const result = await createContentPlanAction({
        date: slot.date,
        time: slot.time,
        channel: slot.channel,
        pillar: slot.pillar,
        format: slot.format,
        objective: slot.objective,
        idea: slot.idea || null,
        productId: slot.productId || null,
      });
      if (result.ok) {
        setSlot({ ...slot, idea: "" });
        setMessage({ kind: "ok", text: "Pieza agregada al plan." });
      }
      return result;
    });

  const removeSlot = (id: string) =>
    run(`del-${id}`, async () => {
      const result = await deleteContentPlanAction(id);
      return result;
    });

  const generateIdeas = () =>
    run("ideas", async () => {
      const result = await generateContentIdeasAction(days[0] ?? "");
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: `La IA propuso ${result.created ?? 0} pieza(s) para la semana. Revisá y ajustá antes de generar.`,
        });
      }
      return result;
    });

  const generateDrafts = (ids: string[]) =>
    run("drafts", async () => {
      const result = await generatePlanDraftsAction(ids);
      if (result.ok) {
        const errors = result.errors && result.errors.length ? ` · ${result.errors[0]}` : "";
        setMessage({
          kind: "ok",
          text: `${result.created ?? 0} borrador(es) generados${errors}. Revisalos y aprobá para que la cola los publique.`,
        });
      }
      return result;
    });

  const approveDrafts = (ids: string[]) =>
    run("approve", async () => {
      const result = await approvePlanDraftsAction(ids);
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: `${result.approved ?? 0} borrador(es) aprobados: la cola los publica en su horario.`,
        });
      }
      return result;
    });

  const pendingIds = plan.filter((row) => !row.postId).map((row) => row.id);
  const draftIds = plan.filter((row) => row.postId && row.postStatus !== "ready").map((row) => row.id);

  return (
    <div className="admin-mkt-planner">
      {message && (
        <p
          className={message.kind === "ok" ? "admin-saved-hint" : "admin-error"}
          role="status"
        >
          {message.text}
        </p>
      )}

      {/* 1. Preferences ------------------------------------------------- */}
      <section className="admin-card admin-mkt-prefs">
        <h3 className="admin-card-title">Preferencias de contenido</h3>
        <p className="admin-field-hint">
          Estas reglas gobiernan la generación: qué pilares se usan, en qué
          formatos, con qué objetivo y a qué horas. Todo lo que no definás
          queda en los valores por defecto.
        </p>

        <div className="admin-form-grid">
          <fieldset className="admin-field admin-field-wide">
            <span>Pilares editoriales</span>
            <div className="admin-mkt-chips">
              {PILLARS.map((pillar) => (
                <button
                  key={pillar}
                  type="button"
                  className={`admin-mkt-chip${draft.pillars.includes(pillar) ? " is-active" : ""}`}
                  onClick={() =>
                    setDraft({ ...draft, pillars: toggle(draft.pillars, pillar) })
                  }
                >
                  {PILLAR_LABELS[pillar]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="admin-field admin-field-wide">
            <span>Formatos</span>
            <div className="admin-mkt-chips">
              {FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  className={`admin-mkt-chip${draft.formats.includes(format) ? " is-active" : ""}`}
                  onClick={() =>
                    setDraft({ ...draft, formats: toggle(draft.formats, format) })
                  }
                >
                  {FORMAT_LABELS[format]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="admin-field admin-field-wide">
            <span>Objetivos</span>
            <div className="admin-mkt-chips">
              {OBJECTIVES.map((objective) => (
                <button
                  key={objective}
                  type="button"
                  className={`admin-mkt-chip${draft.objectives.includes(objective) ? " is-active" : ""}`}
                  onClick={() =>
                    setDraft({ ...draft, objectives: toggle(draft.objectives, objective) })
                  }
                >
                  {OBJECTIVE_LABELS[objective]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="admin-field">
            <span>Audiencia</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder="Mujeres 25-45 que buscan calzado de taco cómodo para el día a día…"
              value={draft.audience ?? ""}
              onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
            />
          </label>

          <label className="admin-field">
            <span>CTA por defecto</span>
            <input
              type="text"
              maxLength={200}
              placeholder="Escribinos al WhatsApp o comprá online en nyady.com"
              value={draft.defaultCta ?? ""}
              onChange={(e) => setDraft({ ...draft, defaultCta: e.target.value })}
            />
          </label>

          <label className="admin-field">
            <span>Horarios (HH:MM, hora Argentina)</span>
            <input
              type="text"
              maxLength={80}
              placeholder="11:00, 19:30"
              value={draft.bestHours.join(", ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  bestHours: e.target.value
                    .split(",")
                    .map((hour) => hour.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="admin-field">
            <span>Posts por semana</span>
            <input
              type="number"
              min={1}
              max={14}
              value={draft.postsPerWeek}
              onChange={(e) =>
                setDraft({ ...draft, postsPerWeek: Number(e.target.value) || 4 })
              }
            />
          </label>

          <label className="admin-field">
            <span>Máx. posts promocionales por semana</span>
            <input
              type="number"
              min={0}
              max={7}
              value={draft.maxPromoPerWeek}
              onChange={(e) =>
                setDraft({ ...draft, maxPromoPerWeek: Number(e.target.value) || 0 })
              }
            />
          </label>

          <label className="admin-field admin-field-wide">
            <span>Temas que la IA nunca debe mencionar (uno por línea)</span>
            <textarea
              rows={3}
              maxLength={600}
              placeholder={"descuentos de otras marcas\ncomparaciones de precio\npromesas de envío exprés"}
              value={draft.forbiddenTopics.join("\n")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  forbiddenTopics: e.target.value.split("\n").map((t) => t.trim()).filter(Boolean),
                })
              }
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={busy === "prefs"}
            onClick={() => void savePreferences()}
          >
            {busy === "prefs" ? "Guardando…" : "Guardar preferencias"}
          </button>
        </div>
      </section>

      {/* 2. Calendar ---------------------------------------------------- */}
      <section className="admin-card admin-mkt-calendar">
        <div className="admin-mkt-stats-head">
          <h3 className="admin-card-title">Calendario de la semana</h3>
          <div className="admin-mkt-stats-headright">
            <button
              type="button"
              className="admin-button small"
              disabled={busy === "ideas"}
              onClick={() => void generateIdeas()}
            >
              {busy === "ideas" ? "Pensando…" : "Proponer semana con IA"}
            </button>
            <button
              type="button"
              className="admin-button small primary"
              disabled={busy === "drafts" || pendingIds.length === 0}
              onClick={() => void generateDrafts(pendingIds)}
            >
              {busy === "drafts"
                ? "Generando…"
                : `Generar borradores (${pendingIds.length})`}
            </button>
            <button
              type="button"
              className="admin-button small"
              disabled={busy === "approve" || draftIds.length === 0}
              onClick={() => void approveDrafts(draftIds)}
            >
              {busy === "approve"
                ? "Aprobando…"
                : `Aprobar y programar (${draftIds.length})`}
            </button>
          </div>
        </div>

        <p className="admin-field-hint">
          Semana del {days[0]} al {days[days.length - 1]} (hora Argentina). Los
          borradores generados quedan en estado “borrador”: revisá el copy y
          aprobá para que la cola los publique en su horario.
        </p>

        <div className="admin-mkt-week">
          {days.map((day) => {
            const rows = planByDay.get(day) ?? [];
            const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
            const label = WEEKDAYS[(weekday + 6) % 7];
            return (
              <div className="admin-mkt-day" key={day}>
                <div className="admin-mkt-day-head">
                  <strong>{label}</strong>
                  <span>{day.slice(8)}/{day.slice(5, 7)}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="admin-cell-sub">—</p>
                ) : (
                  rows.map((row) => (
                    <div className="admin-mkt-day-item" key={row.id}>
                      <span className="admin-mkt-day-time">{row.time}</span>
                      <span className="admin-mkt-day-pillar">
                        {PILLAR_LABELS[row.pillar] ?? row.pillar}
                      </span>
                      <span className="admin-cell-sub">
                        {CHANNEL_LABELS[row.channel] ?? row.channel} ·{" "}
                        {FORMAT_LABELS[row.format] ?? row.format}
                      </span>
                      {row.idea ? (
                        <span className="admin-cell-sub">{row.idea}</span>
                      ) : null}
                      {row.postId ? (
                        <span className="admin-mkt-day-status">
                          {row.postTitle ? (
                            <Link
                              href={`/admin/marketing/${row.postId}`}
                              className="admin-mkt-linklist"
                            >
                              {row.postTitle}
                            </Link>
                          ) : null}
                          <span className="admin-cell-sub">
                            {row.postStatus === "ready"
                              ? " · programado"
                              : " · borrador"}
                            {row.postScheduledAtText
                              ? ` · ${row.postScheduledAtText}`
                              : ""}
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="admin-button small"
                          disabled={busy === `drafts`}
                          onClick={() => void generateDrafts([row.id])}
                        >
                          Generar
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-button small danger"
                        disabled={busy === `del-${row.id}`}
                        onClick={() => void removeSlot(row.id)}
                        aria-label="Quitar del plan"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        <h4 className="admin-content-section-title">Agregar una pieza</h4>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Día</span>
            <select
              value={slot.date}
              onChange={(e) => setSlot({ ...slot, date: e.target.value })}
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Hora</span>
            <input
              type="time"
              value={slot.time}
              onChange={(e) => setSlot({ ...slot, time: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Canal</span>
            <select
              value={slot.channel}
              onChange={(e) => setSlot({ ...slot, channel: e.target.value })}
            >
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Pilar</span>
            <select
              value={slot.pillar}
              onChange={(e) => setSlot({ ...slot, pillar: e.target.value })}
            >
              {PILLARS.map((pillar) => (
                <option key={pillar} value={pillar}>
                  {PILLAR_LABELS[pillar]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Formato</span>
            <select
              value={slot.format}
              onChange={(e) => setSlot({ ...slot, format: e.target.value })}
            >
              {FORMATS.map((format) => (
                <option key={format} value={format}>
                  {FORMAT_LABELS[format]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Objetivo</span>
            <select
              value={slot.objective}
              onChange={(e) => setSlot({ ...slot, objective: e.target.value })}
            >
              {OBJECTIVES.map((objective) => (
                <option key={objective} value={objective}>
                  {OBJECTIVE_LABELS[objective]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Producto (opcional)</span>
            <select
              value={slot.productId}
              onChange={(e) => setSlot({ ...slot, productId: e.target.value })}
            >
              <option value="">— sin producto —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field admin-field-wide">
            <span>Idea / brief</span>
            <input
              type="text"
              maxLength={300}
              placeholder="Mostrar el proceso de armado del taco, con foto de las manos trabajando"
              value={slot.idea}
              onChange={(e) => setSlot({ ...slot, idea: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={busy === "slot"}
            onClick={() => void addSlot()}
          >
            {busy === "slot" ? "Agregando…" : "Agregar al plan"}
          </button>
        </div>
      </section>
    </div>
  );
}
