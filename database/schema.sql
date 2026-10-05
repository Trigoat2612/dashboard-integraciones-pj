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
  imported_at timestamptz not null default now()
);

-- Compatibilidad con una base creada con una versión anterior del proyecto.
alter table judicial_integration_records add column if not exists source_measure_name varchar(180);
alter table judicial_integration_records add column if not exists source_row integer;

create index if not exists idx_judicial_records_integration on judicial_integration_records (integration_name);
create index if not exists idx_judicial_records_year on judicial_integration_records (year);
create index if not exists idx_judicial_records_filters on judicial_integration_records (integration_name, measure_name, year);
create index if not exists idx_judicial_records_location on judicial_integration_records (csj, sede, organo);
create index if not exists idx_judicial_records_source on judicial_integration_records (source_file, source_sheet, source_row);

create table if not exists judicial_imports (
  id bigserial primary key,
  source_file varchar(255) not null,
  rows_imported integer not null,
  import_mode varchar(20) not null check (import_mode in ('replace', 'append')),
  imported_at timestamptz not null default now()
);
