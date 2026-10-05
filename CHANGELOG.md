# Changelog

## 1.2.0 — Incremental Import & Audit Trail

- Importación por conciliación, sin truncar la base vigente.
- Clave funcional normalizada: integración, año, CSJ, sede, órgano/instancia y medida.
- Actualización de cantidad para coincidencias y alta de claves nuevas.
- Conservación de registros vigentes ausentes del nuevo Excel.
- Correo obligatorio para auditoría de carga.
- Fecha/hora registrada en PostgreSQL.
- Reprocesamiento del Excel y SHA-256 en backend.
- Conservación del Excel original de cada carga nueva (máximo 4 MB).
- Tabla `judicial_import_rows` con snapshot inmutable de cada fila cargada.
- Historial visible en el dashboard, con detalle paginado y descarga del Excel original.
- Migración idempotente desde v1.1.x mediante `npm run db:migrate`.
- Se mantiene SheetJS CE 0.20.3 y el hotfix responsive del gráfico anual.
