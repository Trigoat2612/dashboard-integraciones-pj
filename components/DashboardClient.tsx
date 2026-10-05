"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { IconChevron, IconDownload, IconReset, IconUpload } from "@/components/icons";
import { parseExcelFile } from "@/lib/excel-client";
import type { ImportPreview, JudicialRecord } from "@/lib/types";

type ApiPayload = {
  records: JudicialRecord[];
  databaseEnabled: boolean;
  lastImport: string | null;
};

type Filters = {
  integration: string;
  medida: string;
  year: string;
  csj: string;
  sede: string;
  organo: string;
};

const EMPTY_FILTERS: Filters = {
  integration: "",
  medida: "",
  year: "",
  csj: "",
  sede: "",
  organo: "",
};

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort((a, b) => a.localeCompare(b, "es"));
}

function same(value: string | null, expected: string): boolean {
  return !expected || (value ?? "") === expected;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(records: JudicialRecord[]) {
  const header = ["Integración", "Año", "CSJ / Distrito judicial", "Sede", "Órgano / Instancia", "Medida", "Cantidad", "Métrica fuente", "Hoja", "Fila fuente", "Archivo"];
  const body = records.map((record) => [
    record.integration,
    record.year,
    record.csj,
    record.sede,
    record.organo,
    record.medida,
    record.cantidad,
    record.sourceMeasure ?? record.medida,
    record.sourceSheet,
    record.sourceRow ?? "",
    record.sourceFile,
  ]);
  const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `integraciones-judiciales-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function DashboardClient() {
  const [records, setRecords] = useState<JudicialRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("resumen");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/records", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo leer la fuente de datos.");
      const data = (await response.json()) as ApiPayload;
      setRecords(data.records ?? []);
      setDatabaseEnabled(Boolean(data.databaseEnabled));
      setLastImport(data.lastImport);
      setFilters((current) => {
        if (current.integration) return current;
        const integrations = unique((data.records ?? []).map((record) => record.integration));
        const preferred = integrations.find((name) => name.toLocaleLowerCase("es").includes("sentido de fallo"));
        return { ...current, integration: preferred ?? integrations[0] ?? "" };
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const ids = ["resumen", "distribucion", "dependencias", "fuente"];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -60% 0px", threshold: [0.05, 0.3, 0.6] });
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const integrations = useMemo(() => unique(records.map((record) => record.integration)), [records]);
  const integrationRows = useMemo(
    () => records.filter((record) => !filters.integration || record.integration === filters.integration),
    [records, filters.integration],
  );
  const measures = useMemo(() => unique(integrationRows.map((record) => record.medida)), [integrationRows]);

  useEffect(() => {
    if (!measures.length) return;
    if (!filters.medida || !measures.includes(filters.medida)) {
      setFilters((current) => ({ ...current, medida: measures[0] ?? "" }));
    }
  }, [filters.medida, measures]);

  const scopedForOptions = useMemo(
    () => integrationRows.filter((record) => !filters.medida || record.medida === filters.medida),
    [integrationRows, filters.medida],
  );

  const years = useMemo(() => Array.from(new Set<number>(scopedForOptions.map((record) => record.year))).sort((a, b) => a - b), [scopedForOptions]);
  const csjs = useMemo(() => unique(scopedForOptions.map((record) => record.csj)), [scopedForOptions]);
  const sedes = useMemo(() => unique(scopedForOptions.filter((record) => same(record.csj, filters.csj)).map((record) => record.sede)), [scopedForOptions, filters.csj]);
  const organos = useMemo(() => unique(scopedForOptions.filter((record) => same(record.csj, filters.csj) && same(record.sede, filters.sede)).map((record) => record.organo)), [scopedForOptions, filters.csj, filters.sede]);

  const filtered = useMemo(() => records.filter((record) =>
    same(record.integration, filters.integration) &&
    same(record.medida, filters.medida) &&
    (!filters.year || record.year === Number(filters.year)) &&
    same(record.csj, filters.csj) &&
    same(record.sede, filters.sede) &&
    same(record.organo, filters.organo)
  ), [records, filters]);

  const selectedWithoutYear = useMemo(() => records.filter((record) =>
    same(record.integration, filters.integration) &&
    same(record.medida, filters.medida) &&
    same(record.csj, filters.csj) &&
    same(record.sede, filters.sede) &&
    same(record.organo, filters.organo)
  ), [records, filters.integration, filters.medida, filters.csj, filters.sede, filters.organo]);

  const annual = useMemo(() => {
    const totals = new Map<number, number>();
    selectedWithoutYear.forEach((record) => totals.set(record.year, (totals.get(record.year) ?? 0) + record.cantidad));
    return Array.from(totals, ([year, cantidad]) => ({ year, cantidad })).sort((a, b) => a.year - b.year);
  }, [selectedWithoutYear]);

  const total = useMemo(() => filtered.reduce((sum, record) => sum + record.cantidad, 0), [filtered]);
  const selectedYears = useMemo(() => new Set(filtered.map((record) => record.year)).size, [filtered]);
  const selectedSedes = useMemo(() => unique(filtered.map((record) => record.sede)).length, [filtered]);
  const selectedOrganos = useMemo(() => unique(filtered.map((record) => record.organo)).length, [filtered]);

  const topSedes = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((record) => {
      const label = record.sede ?? record.csj ?? record.organo ?? "No informado";
      map.set(label, (map.get(label) ?? 0) + record.cantidad);
    });
    return Array.from(map, ([name, cantidad]) => ({ name, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }, [filtered]);

  const pivot = useMemo(() => {
    const pivotYears = Array.from(new Set<number>(filtered.map((record) => record.year))).sort((a, b) => a - b);
    const map = new Map<string, { label: string; level: 0 | 1 | 2; key: string; parent: string | null; values: Map<number, number>; total: number }>();

    const add = (keyValue: string, label: string, level: 0 | 1 | 2, parent: string | null, record: JudicialRecord) => {
      if (!map.has(keyValue)) map.set(keyValue, { label, level, key: keyValue, parent, values: new Map(), total: 0 });
      const target = map.get(keyValue)!;
      target.values.set(record.year, (target.values.get(record.year) ?? 0) + record.cantidad);
      target.total += record.cantidad;
    };

    filtered.forEach((record) => {
      const csj = record.csj ?? "No informado";
      const sede = record.sede ?? "No informado";
      const organo = record.organo ?? "No informado";
      const csjKey = `c:${csj}`;
      const sedeKey = `${csjKey}|s:${sede}`;
      const organoKey = `${sedeKey}|o:${organo}`;

      if (record.csj) {
        add(csjKey, csj, 0, null, record);
        if (record.sede) add(sedeKey, sede, 1, csjKey, record);
        if (record.organo) add(organoKey, organo, 2, record.sede ? sedeKey : csjKey, record);
      } else if (record.sede) {
        add(sedeKey, sede, 0, null, record);
        if (record.organo) add(organoKey, organo, 1, sedeKey, record);
      } else if (record.organo) {
        add(organoKey, organo, 0, null, record);
      }
    });

    const rows = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key, "es"));
    const visibleRows = rows.filter((row) => {
      if (!row.parent) return true;
      if (!expanded.has(row.parent)) return false;
      const parentRow = map.get(row.parent);
      if (parentRow?.parent && !expanded.has(parentRow.parent)) return false;
      return true;
    });
    return { years: pivotYears, rows: visibleRows, allRows: rows };
  }, [filtered, expanded]);

  const maxAnnual = Math.max(1, ...annual.map((item) => item.cantidad));
  const maxTop = Math.max(1, ...topSedes.map((item) => item.cantidad));
  const annualDense = annual.length > 7;
  const annualScrollable = annual.length > 14;
  const annualValueFormatter = useMemo(
    () => new Intl.NumberFormat("es-PE", {
      notation: annualDense ? "compact" : "standard",
      maximumFractionDigits: annual.length > 10 ? 0 : annualDense ? 1 : 0,
    }),
    [annual.length, annualDense],
  );

  const setFilter = (name: keyof Filters, value: string) => {
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "integration") Object.assign(next, { medida: "", year: "", csj: "", sede: "", organo: "" });
      if (name === "medida") Object.assign(next, { year: "", csj: "", sede: "", organo: "" });
      if (name === "csj") Object.assign(next, { sede: "", organo: "" });
      if (name === "sede") Object.assign(next, { organo: "" });
      return next;
    });
  };

  const resetFilters = () => {
    const preferred = integrations.find((name) => name.toLocaleLowerCase("es").includes("sentido de fallo"));
    setFilters({ ...EMPTY_FILTERS, integration: preferred ?? integrations[0] ?? "" });
  };

  const onFile = async (file: File | null) => {
    setPreview(null);
    setImportMessage("");
    if (!file) return;
    setImportBusy(true);
    try {
      const result = await parseExcelFile(file);
      setPreview(result);
      setImportMessage(result.totalRows ? `Vista previa: ${result.totalRows.toLocaleString("es-PE")} filas fuente. ${result.ignoredSheets} hoja(s) de resumen fueron omitidas.` : "No se encontraron filas compatibles.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo leer el Excel.");
    } finally {
      setImportBusy(false);
    }
  };

  const commitImport = async () => {
    if (!preview?.records.length) return;
    setImportBusy(true);
    setImportMessage("");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: preview.records, fileName: preview.fileName, mode: importMode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la importación.");
      setImportMessage(`Importación completada: ${Number(result.saved).toLocaleString("es-PE")} registros guardados.`);
      setPreview(null);
      await loadData();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((value) => !value)}
        active={activeSection}
        counts={{ integrations: integrations.length, rows: records.length }}
        lastImport={lastImport}
      />

      <main className="main-content">
        <section className="hero" id="resumen">
          <div className="hero-eyebrow"><span /> EJE NO PENAL · ESTADÍSTICA DE INTEGRACIONES</div>
          <div className="hero-grid">
            <div>
              <h1>Observatorio de <em>integraciones judiciales</em></h1>
              <p className="lede">Explora la actividad por año y dependencia judicial. La fuente conserva el nivel disponible en cada hoja y evita sumar subtotales del Excel.</p>
            </div>
            <div className="hero-actions">
              <button className="btn" type="button" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}><IconDownload /> Exportar datos</button>
              <a className="btn btn-primary" href="#fuente"><IconUpload /> Actualizar Excel</a>
            </div>
          </div>
          {!databaseEnabled ? <div className="notice"><strong>Modo local.</strong> La vista usa el corte consolidado de los Excel adjuntos: 10 integraciones y 771 filas fuente. Configura <code>DATABASE_URL</code> para leer y actualizar la base Neon.</div> : null}
          {loadError ? <div className="notice danger">{loadError}</div> : null}
        </section>

        <section className="section-block filter-section">
          <div className="section-heading compact">
            <div className="eyebrow"><span className="num">01</span> · Vista de análisis</div>
            <div className="filter-title-row"><h2>Filtros de <em>consulta</em></h2><button className="text-button" onClick={resetFilters}><IconReset /> Limpiar filtros</button></div>
          </div>
          <div className="filters-grid">
            <label><span>Integración</span><select value={filters.integration} onChange={(e) => setFilter("integration", e.target.value)}><option value="">Todas</option>{integrations.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Medida</span><select value={filters.medida} onChange={(e) => setFilter("medida", e.target.value)} disabled={measures.length <= 1}>{measures.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Año</span><select value={filters.year} onChange={(e) => setFilter("year", e.target.value)}><option value="">Todos los años</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>CSJ / Distrito judicial</span><select value={filters.csj} onChange={(e) => setFilter("csj", e.target.value)} disabled={!csjs.length}><option value="">{csjs.length ? "Todas las CSJ" : "No disponible en la fuente"}</option>{csjs.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Sede</span><select value={filters.sede} onChange={(e) => setFilter("sede", e.target.value)} disabled={!sedes.length}><option value="">Todas las sedes</option>{sedes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Órgano / Instancia</span><select value={filters.organo} onChange={(e) => setFilter("organo", e.target.value)} disabled={!organos.length}><option value="">Todos los órganos</option>{organos.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </section>

        <section className="section-block kpi-section">
          <div className="selection-meta">{filters.integration || "Todas las integraciones"} · {filters.year || "Todos los años"} · {filtered.length.toLocaleString("es-PE")} filas</div>
          <div className="kpi-grid">
            <article><div className="kpi-label">Cantidad total</div><div className="kpi-value">{loading ? "…" : total.toLocaleString("es-PE")}</div><div className="kpi-sub">{filters.medida || "Cantidad"}</div></article>
            <article><div className="kpi-label">Años con información</div><div className="kpi-value">{selectedYears}</div><div className="kpi-sub">{years.length ? `${years[0]} — ${years[years.length - 1]}` : "Sin datos"}</div></article>
            <article><div className="kpi-label">Sedes reportadas</div><div className="kpi-value">{selectedSedes}</div><div className="kpi-sub">En la selección actual</div></article>
            <article><div className="kpi-label">Órganos / instancias</div><div className="kpi-value">{selectedOrganos}</div><div className="kpi-sub">Denominaciones distintas</div></article>
          </div>
        </section>

        <section className="section-block" id="distribucion">
          <div className="section-heading">
            <div className="eyebrow"><span className="num">02</span> · Distribución</div>
            <h2>Lectura <em>anual</em> y concentración</h2>
            <p className="lede">Compara la cantidad reportada por año y las sedes con mayor participación dentro del filtro activo.</p>
          </div>
          <div className="analysis-grid">
            <article className="panel">
              <div className="panel-head"><div><span className="panel-kicker">Distribución anual</span><h3>Cantidad reportada por año</h3></div><span className="panel-count">{annual.length} años</span></div>
              <div className="bar-chart-viewport">
                <div
                  className={`bar-chart ${annualDense ? "dense" : ""} ${annualScrollable ? "scrollable" : ""}`}
                  aria-label="Distribución anual"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(1, annual.length)}, minmax(0, 1fr))`,
                    minWidth: annualScrollable ? `${annual.length * 46}px` : undefined,
                  }}
                >
                  {annual.map((item) => (
                    <button
                      key={item.year}
                      className={`bar-item ${filters.year === String(item.year) ? "selected" : ""}`}
                      onClick={() => setFilter("year", filters.year === String(item.year) ? "" : String(item.year))}
                      title={`${item.year}: ${item.cantidad.toLocaleString("es-PE")} · seleccionar para filtrar`}
                      aria-label={`${item.year}: ${item.cantidad.toLocaleString("es-PE")}. Seleccionar para filtrar.`}
                    >
                      <span className="bar-value">{annualValueFormatter.format(item.cantidad)}</span>
                      <span className="bar-track"><span className="bar-fill" style={{ height: `${Math.max(3, (item.cantidad / maxAnnual) * 100)}%` }} /></span>
                      <span className="bar-year">{item.year}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="panel-note">Selecciona una barra para filtrar el año.</p>
            </article>

            <article className="panel">
              <div className="panel-head"><div><span className="panel-kicker">Sedes con mayor cantidad</span><h3>Las 5 primeras de la selección</h3></div><span className="panel-count">TOP 5</span></div>
              <div className="ranking-list">
                {topSedes.map((item, index) => (
                  <div className="ranking-row" key={item.name}>
                    <span className="rank">0{index + 1}</span>
                    <div className="ranking-main"><div className="ranking-label">{item.name}</div><div className="ranking-track"><span style={{ width: `${(item.cantidad / maxTop) * 100}%` }} /></div></div>
                    <strong>{item.cantidad.toLocaleString("es-PE")}</strong>
                  </div>
                ))}
                {!topSedes.length ? <p className="empty-state">No hay sedes disponibles para la selección.</p> : null}
              </div>
            </article>
          </div>
        </section>

        <section className="section-block" id="dependencias">
          <div className="section-heading">
            <div className="eyebrow"><span className="num">03</span> · Dependencias</div>
            <h2>Detalle por <em>dependencia judicial</em></h2>
            <p className="lede">Tabla dinámica por CSJ, sede y órgano/instancia, con columnas por año y total general.</p>
          </div>
          <div className="pivot-wrap">
            <table className="pivot-table">
              <thead><tr><th>Dependencia judicial</th>{pivot.years.map((year) => <th key={year}>{year}</th>)}<th>Total</th></tr></thead>
              <tbody>
                {pivot.rows.map((row) => {
                  const hasChildren = pivot.allRows.some((candidate) => candidate.parent === row.key);
                  return (
                    <tr key={row.key}>
                      <td>
                        <div className={`dependency-cell level-${row.level}`}>
                          {hasChildren ? <button className={`expand-button ${expanded.has(row.key) ? "open" : ""}`} aria-label={expanded.has(row.key) ? "Contraer" : "Expandir"} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(row.key)) next.delete(row.key); else next.add(row.key); return next; })}><IconChevron /></button> : <span className="expand-spacer" />}
                          <span>{row.label}</span>
                        </div>
                      </td>
                      {pivot.years.map((year) => <td key={year}>{(row.values.get(year) ?? 0).toLocaleString("es-PE")}</td>)}
                      <td className="total-cell">{row.total.toLocaleString("es-PE")}</td>
                    </tr>
                  );
                })}
                {pivot.rows.length ? <tr className="grand-total"><td>Total general</td>{pivot.years.map((year) => <td key={year}>{filtered.filter((record) => record.year === year).reduce((sum, record) => sum + record.cantidad, 0).toLocaleString("es-PE")}</td>)}<td>{total.toLocaleString("es-PE")}</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="data-notes"><span>{filtered.length.toLocaleString("es-PE")} filas de origen · sin sumar subtotales del Excel</span><span>Los ceros representan ausencia de cantidad en la selección.</span><span>No se asignan CSJ a filas que no incluyen ese dato.</span></div>
        </section>

        <section className="section-block" id="fuente">
          <div className="section-heading">
            <div className="eyebrow"><span className="num">04</span> · Fuente Excel</div>
            <h2>Actualizar la <em>base estadística</em></h2>
            <p className="lede">El importador detecta AÑO, CSJ/Distrito Judicial, Sede, Órgano/Instancia y la métrica de cantidad. Las hojas “Res*” se consideran tablas dinámicas de referencia y se omiten para evitar doble conteo.</p>
          </div>
          <div className="import-grid">
            <div className="import-box">
              <label className="file-drop">
                <IconUpload />
                <strong>Selecciona un archivo .xlsx</strong>
                <span>La vista previa se procesa en el navegador antes de guardar.</span>
                <input type="file" accept=".xlsx,.xls" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
              </label>
              <div className="import-controls">
                <label><span>Modo de guardado</span><select value={importMode} onChange={(e) => setImportMode(e.target.value === "append" ? "append" : "replace")}><option value="replace">Reemplazar base</option><option value="append">Agregar registros</option></select></label>
                <button className="btn btn-primary" type="button" onClick={() => void commitImport()} disabled={!preview?.records.length || importBusy || !databaseEnabled}>{importBusy ? "Procesando…" : "Guardar importación"}</button>
              </div>
              {importMessage ? <p className="import-message">{importMessage}</p> : null}
            </div>

            <div className="preview-box">
              <div className="panel-head"><div><span className="panel-kicker">Vista previa</span><h3>{preview?.fileName ?? "Sin archivo seleccionado"}</h3></div>{preview ? <span className="panel-count">{preview.totalRows.toLocaleString("es-PE")} filas</span> : null}</div>
              {preview ? (
                <div className="sheet-list">
                  {preview.sheets.map((sheet) => (
                    <div className="sheet-row" key={sheet.sheet}>
                      <div><strong>{sheet.integration}</strong><span>{sheet.sheet}</span>{sheet.note ? <small>{sheet.note}</small> : null}</div>
                      <div className={`status-badge ${sheet.ignored ? "muted" : sheet.duplicate ? "pending" : sheet.rows ? "ok" : "muted"}`}><b>{sheet.rows}</b><span>{sheet.ignored ? "RESUMEN" : sheet.duplicate ? "OMITIDA" : sheet.rows ? "FILAS" : "SIN DATOS"}</span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="empty-state">Carga el Excel para revisar qué hojas e integraciones serán procesadas.</p>}
            </div>
          </div>
        </section>

        <footer className="main-footer">
          <span>{integrations.length} integraciones disponibles</span>
          <span>Fuente: 3 Excel adjuntos · consolidado canónico v2</span>
        </footer>
      </main>
    </div>
  );
}
