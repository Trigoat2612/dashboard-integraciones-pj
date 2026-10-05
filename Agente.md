## Paleta de colores

Variables CSS obligatorias en :root:

css
--paper:   #FFFFFF;   /* fondo */
--paper-2: #FAFAF9;   /* fondo alternativo, cajas suaves */
--paper-3: #F0F0EE;   /* superficies hundidas, badges pasivos */
--ink:     #0A0A0A;   /* texto principal, líneas decisivas */
--ink-2:   #2A2A2A;   /* texto secundario */
--ink-3:   #6A6A6A;   /* metadatos, leyendas */
--ink-4:   #A0A0A0;   /* deshabilitado */
--rule:    #D8D8D6;   /* divisores finos */
--rule-2:  #B0B0AE;   /* divisores medios */
--navy:    #00244F;   /* azul institucional, palabra clave en títulos */
--coral:   #971914;   /* rojo institucional, elementos críticos */


Reglas de uso del color:
- *Azul #00244F*: palabras clave dentro de títulos en cursiva, números grandes destacados, líneas de ruta crítica, KPIs neutros, ícono activo de la sección.
- *Rojo #971914*: línea del Go-Live en el Gantt, badges/etiquetas críticas, eyebrows numerados de sección, "Versión vigente", marcas de peligro o reprogramación.
- *Verde #2A6B3D* + bg rgba(42,107,61,.1): solo para badges de estado "validado / completado / subsanado" en bitácora de observaciones. No se usa para etiquetas de etapa ni KPIs generales.
- *Ámbar #A67A1E* + bg rgba(166,122,30,.1): solo para badges de estado "pendiente" en bitácora.
- *Colores de etapa del Gantt* (paleta fija, no negociable):
  - Migración → teal #1F6B5E
  - Implementación → púrpura #544578
  - Pruebas → navy #1E2A44
  - Capacitación → ámbar #A67A1E
  - Despliegue → coral #A63D28

## Tipografía

Imports obligatorios desde Google Fonts:

html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300..700&family=JetBrains+Mono:wght@300..600&display=swap" rel="stylesheet">


Variables y uso:

css
--ser: "Fraunces", "Times New Roman", serif;   /* títulos, números grandes, palabras clave */
--san: "Geist", "Helvetica Neue", sans-serif;  /* cuerpo de texto */
--mon: "JetBrains Mono", "Courier New", monospace; /* metadatos, IDs, fechas, etiquetas en mayúscula */


Reglas tipográficas:
- Títulos H1/H2: Fraunces, peso 360-380, font-variation-settings: "opsz" 144, "SOFT" 30, letter-spacing: -0.02em a -0.025em, line-height 0.98-1.06. La palabra clave del título va en <em> con SOFT 90 y color navy.
- Eyebrows de sección: JetBrains Mono, 11px, mayúsculas, letter-spacing: 0.2em, color ink-3 o coral, precedidos del número de sección entre puntos: 01 · Resumen ejecutivo.
- Ledes: Fraunces italic, peso 340, 16-18px, line-height 1.5-1.55, max-width 580-780px.
- Cifras y números grandes (KPIs): Fraunces 38-80px, peso 360, letter-spacing: -0.025em, font-variant-numeric: tabular-nums.
- Metadatos, IDs, fechas en mayúscula, badges: JetBrains Mono 9-11px con letter-spacing entre 0.1em y 0.2em.

## Estructura del documento

Layout principal: grid de dos columnas con sidebar fija de 280px a la izquierda y main scrollable a la derecha. En mobile (<960px) la sidebar se convierte en off-canvas con botón flotante y scrim.

### Sidebar (280px, sticky, full height)

Tres bloques verticales separados por líneas finas 0.5px solid var(--rule):

1. *Brand*: 
   - Eyebrow mono Poder Judicial del Perú
   - Marca Fraunces grande SIJUD con subtitle italic Sistema de Justicia Digital
   - Línea de programa con diamante rojo Despliegue Subsistema Laboral

2. *Selector de versión* (cuando aplica): grid 2×2 o 1×n con fondo paper-3 padding 3px, botones con número en italic Fraunces + fecha en mono pequeño. Activo: fondo blanco con sombra suave. Debajo, indicador vsw-meta con dot verde para vigente o gris para histórica.

3. *Navegación*: items en grid 28px 24px 1fr auto con (a) numerador mono "01", (b) ícono SVG 18×18 stroke-width 1.2, (c) etiqueta sans, (d) badge mono pequeño. Estado activo: fondo rgba(0,36,79,0.05), borde izquierdo de 3px navy, numerador en coral.

4. *Footer de sidebar*: barra de progreso del proyecto (line 3px, ancho var, fill navy, marker today coral, leyenda con fechas inicio-fin en mono) y hint de teclado con tecla ↑ ↓ estilizadas.

### Main content

Padding lateral 56px (24px en mobile, 16px en pequeño), sin max-width (ocupa el ancho disponible).

#### Hero
- Padding 72-96px vertical
- Eyebrow rojo con línea
- H1 Fraunces enorme (48-80px clamp)
- Lede italic 18px max-width 780px
- Línea separadora 0.5px abajo

#### Cada sección numerada
1. Eyebrow <div class="eyebrow"><span class="num">0X</span> · Título corto</div>
2. Título Fraunces con palabra clave en <em> cursiva navy
3. Lede italic
4. Contenido

Las secciones se separan con padding generoso (48-96px) y línea fina superior cuando es necesario.

### Componentes recurrentes

*KPI grid*: 3-5 columnas, separadas por bordes verticales finos. Cada KPI tiene label mono pequeño, value Fraunces grande con unit italic pequeño, sub sans gris.

*Tabla/lista de filas*: grid con columnas fijas, bordes inferiores 0.5px solid rule, padding vertical 18-24px. Sin rayado de filas (zebra). La densidad la da el espaciado, no el color.

*Badges de estado*: padding 5px 10px 5px 8px, border-radius 2px, número en Fraunces italic 17px + etiqueta mono mayúscula 9.5px. Fondo con alpha 0.08-0.1 del color del estado.

*Timeline de hitos*: grid 3 columnas 110px 30px 1fr con línea vertical detrás (::before left:124px). Cada hito: día grande Fraunces + mes mono pequeño + marker circular 11px (rellenos según tipo) + título + descripción + tags coloreados por etapa.

*Gantt*: grid de header sticky con meses, barras posicionadas por porcentaje del span temporal. Overlay con líneas verticales: today (ink, sólida) y go-live (coral, sólida). Barras coloreadas por etapa con la paleta fija de arriba.

*Filtros pildóricos*: botones mono uppercase 11px con dot de color a la izquierda, border 0.5px rule-2, activo con fondo ink y color paper. Acompañados de contador "X / Y" a la derecha.

## Reglas de formato

- Líneas divisorias: 0.5px solid rule. Para énfasis: 1px solid ink (línea decisiva). Nunca bordes gruesos.
- Border-radius general: 2px (badges, filtros). Cajas estructurales sin border-radius.
- Sombras: solo en estados activos de botones, 0 1px 2px rgba(0,0,0,0.08). Nada de sombras decorativas.
- Iconos: SVG inline 18×18 o 20×20 stroke-width 1.2-1.5, dibujados a mano (sin librerías externas).
- No usar gradientes, glassmorphism, neumorphism, ni efectos animados llamativos. Las únicas transiciones permitidas son fades de 160-260ms en hover/active.

## Datos del programa (contexto)

- *Cronograma de despliegue*: Subsistema Laboral, sede Lima Este
- *Etapas en orden*: Migración, Implementación, Pruebas, Capacitación, Despliegue (5 etapas)
- *Actores principales*: PEJENP (programa), SOFTPLAN (proveedor), ETIINLPT (Equipo Técnico Institucional NLPT), DP (Dueños de Proceso), GTI (Gerencia de Tecnologías de Información), CSJ (Cortes Superiores), Consejo Ejecutivo del PJ
- *IDs de actividad*: notación decimal etapa.orden (1.01-1.05 Implementación, 2.01-2.06 Migración, 3.01-3.10 Pruebas, 4.01-4.10 Capacitación, 5.01-5.13 Despliegue)
- *Documentos clave*: 2.3 Acuerdo de Alcance Funcional, 3.1 Análisis por Especialidad Laboral, SDO Specification & Design Outline
- *Cartas SOFTPLAN*: formato Carta N° 00XXX-AAAA-SOFTPLAN
- *Ruta crítica del CPM*: tres cadenas que convergen al Go-Live (Pruebas-spine, Migración, Personas+Admin)

## Cuando produzcas un documento

1. Empieza siempre por las variables CSS, los imports de fuentes y el reset (* { margin:0; padding:0; box-sizing:border-box }).
2. Construye el layout principal en grid antes de meter contenido.
3. Si hay datos tabulares, genera primero el array JS de la data y luego el render dinámico, no escribas filas HTML a mano.
4. Si hay interacción, separa: data (arrays), render (funciones), listeners (al final).
5. Para versiones múltiples del cronograma, encapsula los datos en un objeto VERSIONS con clave por código (v12, v13...) y crea funciones loadVersion(key), renderXForVersion(key).
6. La fecha de "hoy" debe estar en una sola constante const TODAY = new Date('AAAA-MM-DD...'). El texto visible "HOY · X MES" puede repetirse en CSS, pero documéntalo.
7. Antes de cerrar, verifica que toda llamada a document.getElementById(...) que pueda fallar tenga guard if (!el) return.

## Lo que nunca debes hacer

- Usar paletas de colores diferentes "para variar"
- Inventar nombres de equipos, cargos, o siglas que no estén en el contexto arriba
- Reproducir verbatim cartas SOFTPLAN, observaciones o textos legales si los recibes (parafrasea siempre)
- Asumir que una observación documental "menor" se puede omitir — todas las observaciones que aparezcan en bitácoras se conservan
- Cambiar el orden canónico de las etapas (Migración → Implementación → Pruebas → Capacitación → Despliegue)
- Crear sombras, fondos llamativos, ilustraciones decorativas, emojis, o anglicismos innecesarios
- Citar cifras inventadas si te falta el dato — pide la fuente o deja un placeholder explícito