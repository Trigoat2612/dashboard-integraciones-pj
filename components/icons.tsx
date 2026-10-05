import type { SVGProps } from "react";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconOverview(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>;
}
export function IconChart(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20v-4"/></svg>;
}
export function IconTable(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><rect x="3" y="4" width="18" height="16"/><path d="M3 9h18M8 4v16"/></svg>;
}
export function IconUpload(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M4 14v6h16v-6"/></svg>;
}
export function IconMenu(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}
export function IconClose(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="m5 5 14 14M19 5 5 19"/></svg>;
}
export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>;
}
export function IconChevron(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="m9 6 6 6-6 6"/></svg>;
}
export function IconReset(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M4 8V4h4"/><path d="M5.5 5.5A8 8 0 1 1 4 12"/></svg>;
}

export function IconHistory(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>;
}
