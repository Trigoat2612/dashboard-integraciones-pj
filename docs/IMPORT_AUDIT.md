# Importación incremental y auditoría · v1.2.0

## Regla de actualización

Cada fila del Excel se identifica por la clave funcional:

`Integración + Año + CSJ/Distrito judicial + Sede + Órgano/Instancia + Medida`

- Si la clave no existe en la tabla vigente, se **inserta**.
- Si existe y cambia `Cantidad`, se **actualiza**.
- Si existe y la cantidad es igual, se registra como **sin cambio** y se actualiza la trazabilidad de la última carga donde fue observada.
- Un registro vigente que no venga en el Excel **no se elimina**.

La importación rechaza un archivo si contiene dos filas normalizadas con la misma clave funcional, porque no existiría una única versión que aplicar.

## Auditoría

Antes de guardar, la interfaz exige el correo del usuario que realiza la carga. La API vuelve a validarlo.

La fecha/hora de auditoría se genera en PostgreSQL con `now()`. No se confía en el reloj del navegador. La API también vuelve a procesar el Excel y a calcular su SHA-256 desde el archivo recibido; no confía en los datos de vista previa del cliente.

Se conserva:

- nombre del archivo;
- archivo Excel original para descarga posterior (cargas v1.2.0+);
- tamaño en bytes;
- SHA-256 calculado nuevamente en el servidor;
- correo declarado;
- fecha y hora de carga;
- cantidad de integraciones recibidas;
- filas recibidas, insertadas, actualizadas y sin cambio.

## Histórico de datos

`judicial_import_rows` guarda una copia inmutable de cada fila recibida en cada carga, incluyendo:

- dimensiones;
- cantidad cargada;
- cantidad previa cuando existía;
- hoja y fila de origen;
- acción aplicada: `inserted`, `updated`, `unchanged` o `legacy`.

La tabla vigente `judicial_integration_records` conserva solo el estado actual del dashboard.

## Migración desde v1.1.x

En una base Neon que ya contiene los 771 registros iniciales ejecuta:

```bash
npm run db:migrate
npm run db:verify
```

`db:migrate` ejecuta únicamente `database/schema.sql`. **No ejecuta `db:setup` en una base con información que quieras conservar**, porque `db:setup` vuelve a cargar el seed inicial.

Los registros anteriores a esta funcionalidad se respaldan como `legacy`. Como esas cargas no pedían correo, se identifican con `migracion@sijud.local`.

## Archivo original

Las cargas v1.2.0+ guardan el Excel original en `judicial_imports.file_content` (`bytea`) y permiten descargarlo desde el historial. Se limita cada archivo a **4 MB** para evitar convertir PostgreSQL en un almacén de objetos por accidente, una especialidad que no le corresponde. Las cargas migradas desde versiones anteriores no tienen el binario original porque nunca fue almacenado.
