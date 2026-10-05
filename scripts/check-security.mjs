import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const EXPECTED_XLSX_VERSION = "0.20.3";
const EXPECTED_XLSX_SOURCE =
  "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";

let installedVersion;

try {
  const XLSX = require("xlsx");
  installedVersion = XLSX.version;
} catch (error) {
  console.error("[security] No se pudo cargar la dependencia xlsx.");
  console.error("Ejecuta npm install antes de compilar.");
  if (error instanceof Error) console.error(`[security] ${error.message}`);
  process.exit(1);
}

if (!installedVersion) {
  console.error("[security] xlsx está instalado, pero no expone su versión.");
  process.exit(1);
}

if (installedVersion !== EXPECTED_XLSX_VERSION) {
  console.error(
    `[security] Versión insegura o no aprobada de xlsx: ${installedVersion}. ` +
      `Se requiere ${EXPECTED_XLSX_VERSION}.`
  );
  console.error(
    `Reinstala con: npm install --save ${EXPECTED_XLSX_SOURCE}`
  );
  process.exit(1);
}

// Verificación adicional del origen cuando existe package-lock.json.
const scriptDir = dirname(fileURLToPath(import.meta.url));
const lockPath = join(scriptDir, "..", "package-lock.json");

if (existsSync(lockPath)) {
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const xlsxEntry = lock?.packages?.["node_modules/xlsx"];
    const resolved = xlsxEntry?.resolved;

    if (resolved && resolved !== EXPECTED_XLSX_SOURCE) {
      console.error(`[security] xlsx ${installedVersion} proviene de una fuente no aprobada:`);
      console.error(`[security] ${resolved}`);
      console.error(`[security] Fuente esperada: ${EXPECTED_XLSX_SOURCE}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("[security] No se pudo validar package-lock.json.");
    if (error instanceof Error) console.error(`[security] ${error.message}`);
    process.exit(1);
  }
}

console.log(
  `[security] SheetJS CE ${installedVersion}: versión y origen aprobados.`
);
