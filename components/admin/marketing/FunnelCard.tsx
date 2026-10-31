import Link from "next/link";
import { formatARS } from "@/lib/money";
import type { FunnelData } from "@/lib/marketing/funnel";

/**
 * Funnel panel (phase 5): what the social work actually sold.
 *
 * Reads the UTM attribution stored on paid orders. Server component — it
 * only renders data (all interactivity lives in the planner/referral cards).
 */
export default function FunnelCard({ funnel }: { funnel: FunnelData }) {
  const { totals } = funnel;

  return (
    <div className="admin-card admin-mkt-funnel">
      <div className="admin-mkt-stats-head">
        <h3 className="admin-card-title">Embudo social</h3>
        <span className="admin-cell-sub">Datos del {funnel.generatedAtText}</span>
      </div>

      <div className="admin-mkt-stats-totals">
        <span>
          Ventas <strong>{totals.paidOrders.toLocaleString("es-AR")}</strong>
        </span>
        <span>
          Facturado <strong>{formatARS(totals.revenue)}</strong>
        </span>
        <span>
          Ticket prom. <strong>{formatARS(totals.aov)}</strong>
        </span>
        <span>
          Atribuidas <strong>{totals.attributedOrders.toLocaleString("es-AR")}</strong>
        </span>
        <span>
          Social <strong>{totals.socialOrders.toLocaleString("es-AR")}</strong>
        </span>
        <span>
          Directo <strong>{totals.directOrders.toLocaleString("es-AR")}</strong>
        </span>
      </div>

      <p className="admin-field-hint">
        Sólo se cuentan órdenes <strong>aprobados</strong> (pagos acreditados).
        “Atribuidas” son las que llegaron con UTM o código de referido; el resto
        es tráfico directo.
      </p>

      <h4 className="admin-content-section-title">Por origen</h4>
      {funnel.bySource.length === 0 ? (
        <p className="admin-empty">Todavía no hay órdenes con atribución.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Origen</th>
                <th>Órdenes</th>
                <th>Facturado</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {funnel.bySource.map((row) => (
                <tr key={row.source}>
                  <td>{row.label}</td>
                  <td>{row.orders}</td>
                  <td>{formatARS(row.revenue)}</td>
                  <td>{formatARS(row.aov)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 className="admin-content-section-title">Por campaña</h4>
      {funnel.byCampaign.length === 0 ? (
        <p className="admin-empty">
          Todavía no hay campañas con ventas. Publicá posts con campaña
          (campo “campaña”) para que las ventas se atribuyan.
        </p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Post</th>
                <th>Órdenes</th>
                <th>Facturado</th>
                <th>Clics</th>
              </tr>
            </thead>
            <tbody>
              {funnel.byCampaign.map((row) => (
                <tr key={row.campaign}>
                  <td>
                    <strong>{row.campaign}</strong>
                    {row.publishedText ? (
                      <span className="admin-cell-sub"> · {row.publishedText}</span>
                    ) : null}
                  </td>
                  <td>
                    {row.permalink ? (
                      <a
                        href={row.permalink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="admin-mkt-linklist"
                      >
                        {row.postTitle ?? "Ver post"}
                      </a>
                    ) : (
                      (row.postTitle ?? "—")
                    )}
                  </td>
                  <td>{row.orders}</td>
                  <td>{formatARS(row.revenue)}</td>
                  <td>{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {funnel.byReferral.length > 0 && (
        <>
          <h4 className="admin-content-section-title">Por código de referido</h4>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Dueño</th>
                  <th>Descuento</th>
                  <th>Órdenes</th>
                  <th>Facturado</th>
                </tr>
              </thead>
              <tbody>
                {funnel.byReferral.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.code}</strong>
                    </td>
                    <td>{row.owner ?? "—"}</td>
                    <td>{row.discountPercent ? `${row.discountPercent}%` : "—"}</td>
                    <td>{row.orders}</td>
                    <td>{formatARS(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h4 className="admin-content-section-title">Mejores horarios</h4>
      {funnel.hourBuckets.length === 0 ? (
        <p className="admin-empty">
          Sin publicaciones con métricas todavía. El horario se calcula con el
          alcance real de cada post.
        </p>
      ) : (
        <>
          <p className="admin-field-hint">
            Horarios sugeridos: <strong>{funnel.bestHours.join(" · ")}</strong>{" "}
            (hora Argentina). Se arman en Preferencias → Planificador.
          </p>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Posts</th>
                  <th>Alcance prom.</th>
                  <th>Índice prom.</th>
                </tr>
              </thead>
              <tbody>
                {funnel.hourBuckets.slice(0, 8).map((bucket) => (
                  <tr key={bucket.hour}>
                    <td>{bucket.label}</td>
                    <td>{bucket.posts}</td>
                    <td>{bucket.avgReach.toLocaleString("es-AR")}</td>
                    <td>{bucket.avgIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h4 className="admin-content-section-title">Últimas órdenes atribuidas</h4>
      {funnel.recent.length === 0 ? (
        <p className="admin-empty">No hay órdenes con origen registrado.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Origen</th>
                <th>Campaña</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {funnel.recent.map((row) => (
                <tr key={row.id}>
                  <td>{row.createdAtText}</td>
                  <td>{row.customer}</td>
                  <td>
                    {row.source}
                    {row.referralCode ? (
                      <span className="admin-cell-sub"> · {row.referralCode}</span>
                    ) : null}
                  </td>
                  <td>{row.campaign ?? "—"}</td>
                  <td>{row.totalText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-field-hint">
        Los links con UTM los arma el propio sistema al publicar (campaña = el
        campo “campaña” del post). Los códigos de referido viven en{" "}
        <Link href="/admin/marketing/referidos">Referidos</Link>.
      </p>
    </div>
  );
}
