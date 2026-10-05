"use client";

import { IconChart, IconClose, IconHistory, IconMenu, IconOverview, IconTable, IconUpload } from "@/components/icons";

type Props = {
  open: boolean;
  onToggle: () => void;
  active: string;
  counts: { integrations: number; rows: number };
  lastImport: string | null;
};

const items = [
  { id: "resumen", num: "01", label: "Resumen", icon: IconOverview },
  { id: "distribucion", num: "02", label: "Distribución", icon: IconChart },
  { id: "dependencias", num: "03", label: "Dependencias", icon: IconTable },
  { id: "fuente", num: "04", label: "Fuente Excel", icon: IconUpload },
  { id: "historial", num: "05", label: "Historial", icon: IconHistory },
];

function fmtDate(value: string | null): string {
  if (!value) return "Sin importación persistida";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function Sidebar({ open, onToggle, active, counts, lastImport }: Props) {
  return (
    <>
      <button className="mobile-menu" onClick={onToggle} aria-label={open ? "Cerrar navegación" : "Abrir navegación"}>
        {open ? <IconClose /> : <IconMenu />}
      </button>
      <div className={`scrim ${open ? "visible" : ""}`} onClick={onToggle} aria-hidden="true" />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-block">
          <div className="brand-eyebrow">Poder Judicial del Perú</div>
          <div className="brand-name">SIJUD</div>
          <div className="brand-subtitle">Sistema de Justicia Digital</div>
          <div className="program-line"><span className="diamond" /> EJE NO PENAL · Integraciones</div>
        </div>

        <div className="sidebar-meta">
          <div><span>Integraciones</span><strong>{counts.integrations}</strong></div>
          <div><span>Registros</span><strong>{counts.rows.toLocaleString("es-PE")}</strong></div>
        </div>

        <nav className="side-nav" aria-label="Secciones del dashboard">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : ""} onClick={() => { if (window.innerWidth < 960) onToggle(); }}>
                <span className="nav-num">{item.num}</span>
                <Icon />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-label">Última actualización</div>
          <div className="footer-value">{fmtDate(lastImport)}</div>
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="logout-link">Cerrar sesión</button>
          </form>
        </div>
      </aside>
    </>
  );
}
