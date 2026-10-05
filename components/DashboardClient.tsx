"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { IconChevron, IconDownload, IconReset, IconUpload } from "@/components/icons";
import { parseExcelFile } from "@/lib/excel-client";
import type { ImportAudit, ImportAuditRow, ImportPreview, JudicialRecord } from "@/lib/types";

type ApiPayload = {
  records: JudicialRecord[];
  databaseEnabled: boolean;
  lastImport: string | null;
};

type ImportHistoryPayload = {
  imports: ImportAudit[];
};

const AUDIT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HISTORY_PAGE_SIZE = 200;

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function actionLabel(action: ImportAuditRow["action"]): string {
  if (action === "inserted") return "Nuevo";
  if (action === "updated") return "Actualizado";
  if (action === "legacy") return "Migrado";
  return "Sin cambio";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [auditEmail, setAuditEmail] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [imports, setImports] = useState<ImportAudit[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [historyRows, setHistoryRows] = useState<ImportAuditRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyDetailBusy, setHistoryDetailBusy] = useState(false);
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

  const loadHistory = useCallback(async () => {
    setHistoryError("");
    try {
      const response = await fetch("/api/imports?limit=30", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo leer el historial de cargas.");
      const data = (await response.json()) as ImportHistoryPayload;
      setImports(data.imports ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Error al leer el historial.");
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadHistory();
    const savedEmail = window.localStorage.getItem("sijud.auditEmail");
    if (savedEmail) setAuditEmail(savedEmail);
  }, [loadData, loadHistory]);

  useEffect(() => {
    const ids = ["resumen", "distribucion", "dependencias", "fuente", "historial"];
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
    setSelectedFile(null);
    setImportMessage("");
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setImportMessage("El archivo supera el límite de 4 MB para importación y conservación histórica.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await parseExcelFile(file);
      setSelectedFile(file);
      setPreview(result);
      setImportMessage(result.totalRows ? `Vista previa: ${result.totalRows.toLocaleString("es-PE")} filas fuente. ${result.ignoredSheets} hoja(s) de resumen fueron omitidas.` : "No se encontraron filas compatibles.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo leer el Excel.");
    } finally {
      setImportBusy(false);
    }
  };

  const loadImportDetail = async (importId: number, append = false) => {
    setHistoryDetailBusy(true);
    setHistoryError("");
    try {
      const offset = append && selectedImportId === importId ? historyRows.length : 0;
      const response = await fetch(`/api/imports/${importId}?offset=${offset}&limit=${HISTORY_PAGE_SIZE}`, { cache: "no-store" });
      const result = (await response.json()) as { rows?: ImportAuditRow[]; total?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo leer el detalle histórico.");
      setSelectedImportId(importId);
      setHistoryTotal(Number(result.total ?? 0));
      setHistoryRows((current) => (append && selectedImportId === importId ? [...current, ...(result.rows ?? [])] : result.rows ?? []));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Error al leer el detalle histórico.");
    } finally {
      setHistoryDetailBusy(false);
    }
  };

  const commitImport = async () => {
    if (!preview?.records.length || !selectedFile) return;
    const email = auditEmail.trim().toLocaleLowerCase("es");
    if (!AUDIT_EMAIL_RE.test(email)) {
      setImportMessage("Ingresa un correo electrónico válido para registrar la auditoría de la carga.");
      return;
    }

    setImportBusy(true);
    setImportMessage("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("userEmail", email);
      const response = await fetch("/api/import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la importación.");
      window.localStorage.setItem("sijud.auditEmail", email);
      setImportMessage(
        `Carga #${Number(result.importId)} completada: ${Number(result.inserted).toLocaleString("es-PE")} nuevos, ` +
          `${Number(result.updated).toLocaleString("es-PE")} actualizados y ${Number(result.unchanged).toLocaleString("es-PE")} sin cambio.`,
      );
      setPreview(null);
      setSelectedFile(null);
      await Promise.all([loadData(), loadHistory()]);
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
            <p className="lede">El importador cruza cada fila con la base vigente: actualiza cantidades existentes y agrega claves nuevas sin eliminar registros ausentes del archivo. Cada carga conserva auditoría e histórico inmutable.</p>
          </div>
          <div className="import-grid">
            <div className="import-box">
              <label className="file-drop">
                <IconUpload />
                <strong>Selecciona un archivo .xlsx</strong>
                <span>La vista previa se procesa en el navegador antes de guardar.</span>
                <input type="file" accept=".xlsx,.xls" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
              </label>
              <div className="merge-policy">
                <strong>Actualización incremental</strong>
                <span>Coincidencia: Integración + Año + CSJ + Sede + Órgano/Instancia + Medida. Las coincidencias se actualizan; las claves nuevas se insertan.</span>
              </div>
              <div className="import-controls">
                <label>
                  <span>Correo del usuario · auditoría</span>
                  <input type="email" value={auditEmail} onChange={(event) => setAuditEmail(event.target.value)} placeholder="usuario@dominio.pe" autoComplete="email" />
                </label>
                <button className="btn btn-primary" type="button" onClick={() => void commitImport()} disabled={!preview?.records.length || !selectedFile || importBusy || !databaseEnabled || !AUDIT_EMAIL_RE.test(auditEmail.trim())}>{importBusy ? "Procesando…" : "Actualizar base"}</button>
              </div>
              {importMessage ? <p className="import-message">{importMessage}</p> : null}
            </div>

            <div className="preview-box">
              <div className="panel-head"><div><span className="panel-kicker">Vista previa</span><h3>{preview?.fileName ?? "Sin archivo seleccionado"}</h3></div>{preview ? <span className="panel-count">{preview.totalRows.toLocaleString("es-PE")} filas</span> : null}</div>
              {preview ? <div className="file-fingerprint"><span>{formatBytes(preview.fileSizeBytes)}</span><span>SHA-256 · {preview.fileSha256.slice(0, 12)}…</span></div> : null}
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

        <section className="section-block" id="historial">
          <div className="section-heading">
            <div className="eyebrow"><span className="num">05</span> · Auditoría</div>
            <h2>Historial de <em>cargas</em></h2>
            <p className="lede">Cada importación conserva archivo, huella SHA-256, correo declarado, fecha y hora del servidor, además de una copia de todas las filas recibidas y el resultado de la conciliación.</p>
          </div>
          {historyError ? <div className="notice danger">{historyError}</div> : null}
          <div className="history-list">
            {imports.map((item) => (
              <article className={`history-import ${selectedImportId === item.id ? "selected" : ""}`} key={item.id}>
                <div className="history-import-main">
                  <div className="history-id">CARGA #{item.id}</div>
                  <strong>{item.sourceFile}</strong>
                  <span>{formatDateTime(item.importedAt)} · {item.importedByEmail}</span>
                  <small>{formatBytes(item.fileSizeBytes)} · SHA-256 {item.fileSha256 ? `${item.fileSha256.slice(0, 12)}…` : "no disponible"}</small>
                </div>
                <div className="history-stats">
                  <span><b>{item.rowsReceived.toLocaleString("es-PE")}</b> recibidas</span>
                  <span><b>{item.rowsInserted.toLocaleString("es-PE")}</b> nuevas</span>
                  <span><b>{item.rowsUpdated.toLocaleString("es-PE")}</b> actualizadas</span>
                  <span><b>{item.rowsUnchanged.toLocaleString("es-PE")}</b> sin cambio</span>
                </div>
                <div className="history-actions">
                  <button className="btn" type="button" onClick={() => void loadImportDetail(item.id)} disabled={historyDetailBusy && selectedImportId === item.id}>
                    {historyDetailBusy && selectedImportId === item.id ? "Cargando…" : "Ver datos"}
                  </button>
                  {item.hasFile ? <a className="btn" href={`/api/imports/${item.id}/file`}>Descargar Excel</a> : null}
                </div>
              </article>
            ))}
            {!imports.length && !historyError ? <p className="empty-state">Todavía no existen cargas auditadas en esta base.</p> : null}
          </div>

          {selectedImportId ? (
            <div className="history-detail">
              <div className="panel-head">
                <div><span className="panel-kicker">Detalle histórico</span><h3>Carga #{selectedImportId}</h3></div>
                <span className="panel-count">{historyRows.length.toLocaleString("es-PE")} / {historyTotal.toLocaleString("es-PE")}</span>
              </div>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead><tr><th>Acción</th><th>Integración</th><th>Año</th><th>Dependencia</th><th>Anterior</th><th>Cargado</th><th>Fuente</th></tr></thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.id}>
                        <td><span className={`history-action ${row.action}`}>{actionLabel(row.action)}</span></td>
                        <td>{row.integration}</td>
                        <td>{row.year}</td>
                        <td><strong>{row.csj ?? row.sede ?? row.organo ?? "No informado"}</strong><small>{[row.csj ? row.sede : null, row.organo].filter(Boolean).join(" · ")}</small></td>
                        <td>{row.previousCantidad === null ? "—" : row.previousCantidad.toLocaleString("es-PE")}</td>
                        <td>{row.cantidad.toLocaleString("es-PE")}</td>
                        <td><span>{row.sourceSheet}</span><small>{row.sourceRow ? `Fila ${row.sourceRow}` : ""}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {historyRows.length < historyTotal ? (
                <button className="btn history-more" type="button" onClick={() => void loadImportDetail(selectedImportId, true)} disabled={historyDetailBusy}>
                  {historyDetailBusy ? "Cargando…" : `Cargar ${Math.min(HISTORY_PAGE_SIZE, historyTotal - historyRows.length)} filas más`}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <footer className="main-footer">
          <span>{integrations.length} integraciones disponibles</span>
          <span>Actualización incremental · historial de auditoría habilitado</span>
        </footer>
      </main>
    </div>
  );
}
