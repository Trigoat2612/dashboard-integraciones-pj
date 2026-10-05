select count(*) as filas_vigentes from judicial_integration_records;
select count(*) as cargas_auditadas from judicial_imports;
select count(*) as filas_historicas from judicial_import_rows;

select integration_name, count(*) as filas, min(year) as anio_desde, max(year) as anio_hasta, sum(cantidad) as total
from judicial_integration_records
group by integration_name
order by integration_name;

select
  id as carga,
  source_file,
  imported_by_email,
  imported_at,
  rows_received,
  rows_inserted,
  rows_updated,
  rows_unchanged,
  integration_count
from judicial_imports
order by imported_at desc, id desc
limit 20;
