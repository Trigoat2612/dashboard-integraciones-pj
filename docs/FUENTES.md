# Fuentes estadísticas consolidadas

Corte revisado: **05/10/2026**.

Los tres Excel adjuntos fueron comparados a nivel de las hojas fuente. El archivo **`Reporte Estadistico de la Integraciones v2(1).xlsx`** contiene el conjunto completo de **10 integraciones y 771 filas fuente**. Los otros dos archivos son subconjuntos idénticos de ese libro y se conservan como respaldo/validación, pero no deben cargarse adicionalmente porque duplicarían datos.

| Integración | Hoja fuente | Filas | Años | Total |
|---|---|---:|---|---:|
| Sentido de Fallo | fallolaboral | 42 | 2024–2026 | 2,983 |
| REPEJ | REPEJ | 4 | 2024–2025 | 8 |
| SERNOT | SERNOT | 440 | 2014–2026 | 1,529,253 |
| REDJUM | REDJUM | 6 | 2024–2026 | 67 |
| Embargos | embargos | 54 | 2024–2026 | 4,163 |
| Multas | sinarej multas | 73 | 2024–2026 | 712 |
| Jurisprudencia | jurisprudencia | 5 | 2025–2026 | 1,539 |
| Casillero Digital | casillero | 83 | 2024–2026 | 225,679 |
| Depósitos | depositos | 61 | 2024–2026 | 10,139 |
| SUNARP | sunarp | 3 | 2024–2025 | 4 |

**Total:** 771 filas fuente y 1,774,547 unidades reportadas sumando todas las integraciones.

## Reglas de normalización

- Las hojas cuyo nombre inicia en `Res`, `Res.` o `Resumen` son tablas dinámicas de referencia y **no se importan** a la base.
- La medida operativa se normaliza como `Cantidad`; se conserva el encabezado original en `source_measure_name`.
- Para SERNOT se utiliza `TOTAL_CEDULAS` como cantidad principal. La columna `TOTAL DISCAPACITADO` contiene 0 en las 440 filas del corte y no se utiliza para el totalizado principal.
- Para SUNARP, `x_nom_instancia` se utiliza como órgano porque contiene la denominación más específica del órgano jurisdiccional; `Instancia` es una clasificación más general.
- Los campos no presentes en una hoja quedan en `NULL`; no se inventa CSJ ni sede.
- `source_sheet`, `source_file` y `source_row` permiten rastrear cada registro hasta el Excel.

## Duplicidad entre archivos adjuntos

- `consulta 05102026xlsx(1).xlsx`: `fallolaboral` y `repej` coinciden exactamente con las hojas equivalentes del archivo v2.
- `Reporte Estadistico de la Integraciones(1).xlsx`: `embargos`, `sinarej multas`, `jurisprudencia`, `casillero`, `depositos` y `sunarp` coinciden exactamente con el archivo v2.

Por ello, para una carga completa se debe usar **solo el archivo v2** o ejecutar el seed incluido en `database/seed.sql`.
