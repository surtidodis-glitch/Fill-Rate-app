// Convierte un número de semana ISO (1-53) + año, a un mes calendario (1-12).
// Se usa para agrupar el reporte semanal en un reporte mensual, ya que el
// Excel solo trae "SEMANA" (ej. "W27") sin fecha exacta.
//
// LIMITACIÓN: esto es una aproximación estándar (semana ISO 8601), asume
// que el año fue capturado correctamente en la carga. Si en el futuro el
// Excel incluye una fecha real, hay que reemplazar esta función por esa
// fecha directamente — sería más preciso.
export function semanaIsoAMes(numeroSemana: number, anio: number): number {
  // El jueves de la semana ISO cae siempre en el mes correcto
  const simple = new Date(anio, 0, 1 + (numeroSemana - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = new Date(simple);
  isoWeekStart.setDate(simple.getDate() - ((dayOfWeek + 6) % 7));
  const thursday = new Date(isoWeekStart);
  thursday.setDate(isoWeekStart.getDate() + 3);
  return thursday.getMonth() + 1; // 1-12
}

export function extraerNumeroSemana(semanaLabel: string): number | null {
  const match = semanaLabel.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
