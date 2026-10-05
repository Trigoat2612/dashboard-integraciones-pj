-- SIJUD · Esquema evolutivo v1.2.0
-- Importaciones incrementales + auditoría + histórico inmutable de filas cargadas.

create table if not exists judicial_imports (
  id bigserial primary key,
  source_file varchar(255) not null,
  rows_imported integer not null default 0,
  import_mode varchar(20) not null default 'merge',
  imported_at timestamptz not null default now(),
  imported_by_email varchar(320),
  file_sha256 char(64),
  file_size_bytes bigint,
  file_mime_type varchar(120),
  file_content bytea,
  rows_received integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_unchanged integer not null default 0,
  integration_count integer not null default 0
);

-- Compatibilidad con versiones anteriores.
alter table judicial_imports add column if not exists imported_by_email varchar(320);
alter table judicial_imports add column if not exists file_sha256 char(64);
alter table judicial_imports add column if not exists file_size_bytes bigint;
alter table judicial_imports add column if not exists file_mime_type varchar(120);
alter table judicial_imports add column if not exists file_content bytea;
alter table judicial_imports add column if not exists rows_received integer not null default 0;
alter table judicial_imports add column if not exists rows_inserted integer not null default 0;
alter table judicial_imports add column if not exists rows_updated integer not null default 0;
alter table judicial_imports add column if not exists rows_unchanged integer not null default 0;
alter table judicial_imports add column if not exists integration_count integer not null default 0;
alter table judicial_imports alter column rows_imported set default 0;
alter table judicial_imports alter column import_mode set default 'merge';
alter table judicial_imports drop constraint if exists judicial_imports_import_mode_check;
alter table judicial_imports add constraint judicial_imports_import_mode_check check (import_mode in ('replace', 'append', 'merge'));

-- Las cargas históricas previas a v1.2.0 no tenían correo declarado.
update judicial_imports
set imported_by_email = 'migracion@sijud.local'
where imported_by_email is null or btrim(imported_by_email) = '';

update judicial_imports
set
  rows_received = case when rows_received = 0 then rows_imported else rows_received end,
  rows_inserted = case when rows_inserted = 0 and rows_updated = 0 and rows_unchanged = 0 then rows_imported else rows_inserted end
where rows_imported > 0;

alter table judicial_imports alter column imported_by_email set not null;

create index if not exists idx_judicial_imports_date on judicial_imports (imported_at desc);
create index if not exists idx_judicial_imports_email on judicial_imports (imported_by_email);
create index if not exists idx_judicial_imports_hash on judicial_imports (file_sha256);

create table if not exists judicial_integration_records (
  id bigserial primary key,
  integration_name varchar(180) not null,
  year integer not null check (year between 1900 and 2200),
  csj varchar(240),
  sede varchar(320),
  organo varchar(420),
  measure_name varchar(180) not null default 'Cantidad',
  source_measure_name varchar(180),
  cantidad bigint not null,
  source_sheet varchar(255) not null,
  source_file varchar(255) not null,
  source_row integer,
  imported_at timestamptz not null default now(),
  source_import_id bigint,
  created_at timestamptz not null default now(),
  created_by_email varchar(320),
  updated_at timestamptz not null default now(),
  updated_by_email varchar(320),
  last_seen_at timestamptz not null default now()
);

-- Compatibilidad con una base creada con una versión anterior del proyecto.
alter table judicial_integration_records add column if not exists source_measure_name varchar(180);
alter table judicial_integration_records add column if not exists source_row integer;
alter table judicial_integration_records add column if not exists source_import_id bigint;
alter table judicial_integration_records add column if not exists created_at timestamptz not null default now();
alter table judicial_integration_records add column if not exists created_by_email varchar(320);
alter table judicial_integration_records add column if not exists updated_at timestamptz not null default now();
alter table judicial_integration_records add column if not exists updated_by_email varchar(320);
alter table judicial_integration_records add column if not exists last_seen_at timestamptz not null default now();

-- FK añadida de forma idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_judicial_records_source_import'
  ) then
    alter table judicial_integration_records
      add constraint fk_judicial_records_source_import
      foreign key (source_import_id) references judicial_imports(id) on delete set null;
  end if;
end $$;

create index if not exists idx_judicial_records_integration on judicial_integration_records (integration_name);
create index if not exists idx_judicial_records_year on judicial_integration_records (year);
create index if not exists idx_judicial_records_filters on judicial_integration_records (integration_name, measure_name, year);
create index if not exists idx_judicial_records_location on judicial_integration_records (csj, sede, organo);
create index if not exists idx_judicial_records_source on judicial_integration_records (source_file, source_sheet, source_row);
create index if not exists idx_judicial_records_import on judicial_integration_records (source_import_id);

-- Normalización compartida para la clave funcional: ignora mayúsculas, tildes y espacios repetidos.
create or replace function sijud_norm_key(input_text text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      btrim(translate(coalesce(input_text, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
      '[[:space:]]+',
      ' ',
      'g'
    )
  )
$$;

-- Clave funcional del registro vigente.
drop index if exists uq_judicial_records_business_key;
create unique index uq_judicial_records_business_key
on judicial_integration_records (
  sijud_norm_key(integration_name),
  year,
  sijud_norm_key(csj),
  sijud_norm_key(sede),
  sijud_norm_key(organo),
  sijud_norm_key(measure_name)
);

create table if not exists judicial_import_rows (
  id bigserial primary key,
  import_id bigint not null references judicial_imports(id) on delete cascade,
  current_record_id bigint references judicial_integration_records(id) on delete set null,
  integration_name varchar(180) not null,
  year integer not null,
  csj varchar(240),
  sede varchar(320),
  organo varchar(420),
  measure_name varchar(180) not null,
  source_measure_name varchar(180),
  cantidad bigint not null,
  previous_cantidad bigint,
  source_sheet varchar(255) not null,
  source_file varchar(255) not null,
  source_row integer,
  row_action varchar(20) not null check (row_action in ('inserted', 'updated', 'unchanged', 'legacy')),
  archived_at timestamptz not null default now()
);

create index if not exists idx_judicial_import_rows_import on judicial_import_rows (import_id, id);
create index if not exists idx_judicial_import_rows_integration on judicial_import_rows (integration_name, year);
create index if not exists idx_judicial_import_rows_action on judicial_import_rows (import_id, row_action);

-- Backfill mínimo para instalaciones que migran desde v1.1.x.
do $$
declare
  v_import_id bigint;
begin
  if exists (select 1 from judicial_integration_records)
     and not exists (select 1 from judicial_import_rows) then
    select id into v_import_id
    from judicial_imports
    order by imported_at desc, id desc
    limit 1;

    if v_import_id is null then
      insert into judicial_imports (
        source_file, rows_imported, import_mode, imported_by_email,
        rows_received, rows_inserted, rows_updated, rows_unchanged, integration_count
      )
      select
        'migracion-v1.2.0', count(*)::int, 'merge', 'migracion@sijud.local',
        count(*)::int, count(*)::int, 0, 0, count(distinct integration_name)::int
      from judicial_integration_records
      returning id into v_import_id;
    end if;

    update judicial_integration_records
    set source_import_id = coalesce(source_import_id, v_import_id)
    where source_import_id is null;

    insert into judicial_import_rows (
      import_id, current_record_id, integration_name, year, csj, sede, organo,
      measure_name, source_measure_name, cantidad, previous_cantidad,
      source_sheet, source_file, source_row, row_action
    )
    select
      v_import_id, id, integration_name, year, csj, sede, organo,
      measure_name, source_measure_name, cantidad, null,
      source_sheet, source_file, source_row, 'legacy'
    from judicial_integration_records;
  end if;
end $$;
