select count(*) as filas_fuente from judicial_integration_records;

select integration_name, count(*) as filas, min(year) as anio_desde, max(year) as anio_hasta, sum(cantidad) as total
from judicial_integration_records
group by integration_name
order by integration_name;

select integration_name, year, sum(cantidad) as total
from judicial_integration_records
group by integration_name, year
order by integration_name, year;
