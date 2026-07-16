import * as XLSX from "xlsx";

/**
 * Contrato de columnas esperado en la hoja BASE_MAESTRA.
 * Si el Excel cambia sus encabezados, este es el único lugar que hay que tocar.
 */
const REQUIRED_COLUMNS = [
  "SEMANA",
  "PAIS",
  "TIENDA",
  "DEPARTAMENTO",
  "CATEGORIA",
  "SUBCATEGORIA",
  "SURTIDO",
  "ENTREGA",
  "FILL RATE",
  "CLASIFICACION",
] as const;

// Normaliza encabezados: quita tildes, pasa a mayúsculas, colapsa espacios
function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export interface ParsedRow {
  semana: string;
  pais: string;
  tienda: string;
  departamento: string;
  categoria: string;
  subcategoria: string;
  surtido: number;
  entrega: number;
  fillRate: number;
  clasificacion: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
  totalRowsInSheet: number;
}

const HOJA_OBJETIVO = "BASE_MAESTRA";
const HOJA_IGNORADA = "SV";

export function parseFillRateWorkbook(buffer: Buffer): ParseResult {
  const errors: string[] = [];
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames.includes(HOJA_OBJETIVO)) {
    throw new Error(
      `No se encontró la hoja "${HOJA_OBJETIVO}" en el archivo. Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }
  if (workbook.SheetNames.includes(HOJA_IGNORADA)) {
    // La hoja SV existe pero se ignora deliberadamente — no es un error
  }

  const sheet = workbook.Sheets[HOJA_OBJETIVO];
  // defval:null asegura que celdas vacías no rompan el mapeo de columnas
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (raw.length === 0) {
    throw new Error(`La hoja "${HOJA_OBJETIVO}" no contiene filas de datos.`);
  }

  // Construye un mapa de encabezado normalizado -> encabezado real de la fila
  const sampleKeys = Object.keys(raw[0]);
  const headerMap = new Map(sampleKeys.map((k) => [normalizeHeader(k), k]));

  const missing = REQUIRED_COLUMNS.filter((c) => !headerMap.has(c));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas requeridas en BASE_MAESTRA: ${missing.join(", ")}`);
  }

  const rows: ParsedRow[] = [];
  raw.forEach((record, i) => {
    const get = (col: string) => record[headerMap.get(col)!];
    const rowNum = i + 2; // +2 porque la fila 1 es encabezado y XLSX es 0-index

    const semana = get("SEMANA");
    const surtido = get("SURTIDO");
    const entrega = get("ENTREGA");

    if (!semana || surtido == null || entrega == null) {
      errors.push(`Fila ${rowNum}: faltan valores obligatorios (semana/surtido/entrega) — se omite.`);
      return;
    }

    const surtidoNum = Number(surtido);
    const entregaNum = Number(entrega);
    if (Number.isNaN(surtidoNum) || Number.isNaN(entregaNum)) {
      errors.push(`Fila ${rowNum}: surtido o entrega no es numérico — se omite.`);
      return;
    }

    let fillRateRaw = get("FILL RATE");
    let fillRate: number;
    if (fillRateRaw == null) {
      fillRate = surtidoNum > 0 ? Number(((entregaNum / surtidoNum) * 100).toFixed(2)) : 0;
    } else if (typeof fillRateRaw === "number" && fillRateRaw <= 1.5) {
      // Excel a veces guarda el % como fracción (0.98 en vez de 98)
      fillRate = Number((fillRateRaw * 100).toFixed(2));
    } else {
      fillRate = Number(String(fillRateRaw).replace("%", "").trim());
    }

    rows.push({
      semana: String(semana).trim(),
      pais: String(get("PAIS") ?? "").trim(),
      tienda: String(get("TIENDA") ?? "").trim(),
      departamento: String(get("DEPARTAMENTO") ?? "").trim(),
      categoria: String(get("CATEGORIA") ?? "").trim(),
      subcategoria: String(get("SUBCATEGORIA") ?? "").trim(),
      surtido: surtidoNum,
      entrega: entregaNum,
      fillRate,
      clasificacion: String(get("CLASIFICACION") ?? "").trim(),
    });
  });

  return { rows, errors, totalRowsInSheet: raw.length };
}
