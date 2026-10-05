# Seguridad de dependencias

## SheetJS / `xlsx`

Este proyecto NO debe instalar `xlsx` desde el registro público de npm con:

```bash
npm install xlsx
```

El paquete `xlsx` publicado en npm está desactualizado (0.18.5) y se encuentra afectado por vulnerabilidades conocidas de Prototype Pollution y ReDoS.

El proyecto utiliza SheetJS Community Edition 0.20.3 desde el canal oficial de distribución de SheetJS:

```text
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

La dependencia se encuentra fijada de forma explícita en `package.json`.

Para reinstalarla manualmente:

```bash
npm uninstall xlsx
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Después de cualquier modificación de dependencias ejecutar:

```bash
npm audit
npm run lint
npm run build
```

No se debe sustituir esta referencia por `xlsx@latest` del registro npm sin verificar previamente la fuente y la versión efectiva instalada.
