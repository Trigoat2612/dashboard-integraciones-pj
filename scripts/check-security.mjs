import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const EXPECTED_XLSX_VERSION = "0.20.3";

let installedVersion;
try {
  installedVersion = require("xlsx/package.json").version;
} catch {
  console.error("[security] No se pudo determinar la versión instalada de xlsx.");
  console.error("Ejecuta npm install antes de compilar.");
  process.exit(1);
}

if (installedVersion !== EXPECTED_XLSX_VERSION) {
  console.error(
    `[security] Versión insegura o no aprobada de xlsx: ${installedVersion}. ` +
      `Se requiere ${EXPECTED_XLSX_VERSION}.`
  );
  console.error(
    "Reinstala con: npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
  );
  process.exit(1);
}

console.log(`[security] SheetJS CE ${installedVersion}: versión aprobada.`);
