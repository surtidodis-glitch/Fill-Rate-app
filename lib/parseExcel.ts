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
  diferencia: number; // entrega - surtido: positivo = sobró, negativo = faltó
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

/**
 * Excel permite "combinar celdas" (ej. la columna SEMANA se ve con el mismo
 * valor a lo largo de varias filas, pero solo la primera fila del grupo
 * realmente tiene el dato guardado). Esta función copia ese valor a todas
 * las filas que pertenecen al mismo rango combinado, antes de leer la hoja.
 */
function rellenarCeldasCombinadas(sheet: XLSX.WorkSheet): void {
  const merges = sheet["!merges"];
  if (!merges) return;

  for (const range of merges) {
    const anchorAddress = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
    const anchorCell = sheet[anchorAddress];
    if (!anchorCell) continue;

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const address = XLSX.utils.encode_cell({ r, c });
        if (!sheet[address]) {
          sheet[address] = { ...anchorCell };
        }
      }
    }
  }
}

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
  rellenarCeldasCombinadas(sheet);
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
  // Recuerda el último valor visto de cada columna de texto, para el caso
  // en que el Excel deje celdas en blanco en vez de usar combinación real.
  let ultimaSemana = "";
  let ultimoPais = "";
  let ultimaTienda = "";
  let ultimoDepartamento = "";
  let ultimaCategoria = "";
  let ultimaSubcategoria = "";

  raw.forEach((record, i) => {
    const get = (col: string) => record[headerMap.get(col)!];
    const rowNum = i + 2; // +2 porque la fila 1 es encabezado y XLSX es 0-index

    const semanaCelda = get("SEMANA");
    const surtidoCelda = get("SURTIDO");
    const entregaCelda = get("ENTREGA");
    const tiendaCelda = get("TIENDA");
    const categoriaCelda = get("CATEGORIA");

    const semana = semanaCelda != null && String(semanaCelda).trim() !== "" ? String(semanaCelda).trim() : ultimaSemana;

    const filaCompletamenteVacia =
      !semana &&
      (tiendaCelda == null || String(tiendaCelda).trim() === "") &&
      (categoriaCelda == null || String(categoriaCelda).trim() === "") &&
      surtidoCelda == null &&
      entregaCelda == null;

    if (filaCompletamenteVacia) {
      errors.push(`Fila ${rowNum}: fila vacía — se omite.`);
      return;
    }

    if (!semana) {
      errors.push(`Fila ${rowNum}: no se pudo determinar la semana — se omite.`);
      return;
    }

    // Si surtido/entrega vienen vacíos pero el resto de la fila sí tiene datos,
    // se completan con 0 en vez de descartar la fila entera.
    const surtidoNum = surtidoCelda == null || String(surtidoCelda).trim() === "" ? 0 : Number(surtidoCelda);
    const entregaNum = entregaCelda == null || String(entregaCelda).trim() === "" ? 0 : Number(entregaCelda);

    if (Number.isNaN(surtidoNum) || Number.isNaN(entregaNum)) {
      errors.push(`Fila ${rowNum}: surtido o entrega no es numérico — se omite.`);
      return;
    }

    // El Fill Rate siempre se calcula, nunca se toma de una columna del Excel
    // (esa columna puede venir mal capturada o desactualizada).
    const fillRate = surtidoNum > 0 ? Number(((entregaNum / surtidoNum) * 100).toFixed(2)) : 0;
    // Diferencia: positivo = entregaron de más, negativo = faltó entregar.
    const diferencia = entregaNum - surtidoNum;

    const pais = String(get("PAIS") ?? "").trim() || ultimoPais;
    const tienda = String(get("TIENDA") ?? "").trim() || ultimaTienda;
    const departamento = String(get("DEPARTAMENTO") ?? "").trim() || ultimoDepartamento;
    const categoria = String(get("CATEGORIA") ?? "").trim() || ultimaCategoria;
    const subcategoria = String(get("SUBCATEGORIA") ?? "").trim() || ultimaSubcategoria;

    ultimaSemana = semana;
    ultimoPais = pais;
    ultimaTienda = tienda;
    ultimoDepartamento = departamento;
    ultimaCategoria = categoria;
    ultimaSubcategoria = subcategoria;

    rows.push({
      semana,
      pais,
      tienda,
      departamento,
      categoria,
      subcategoria,
      surtido: surtidoNum,
      entrega: entregaNum,
      diferencia,
      fillRate,
      clasificacion: String(get("CLASIFICACION") ?? "").trim(),
    });
  });

  return { rows, errors, totalRowsInSheet: raw.length };
}

// --- Reporte DATO_MEZCLA (separado de BASE_MAESTRA) ---

const HOJA_MEZCLA = "DATO_MEZCLA";
const REQUIRED_COLUMNS_MEZCLA = ["SEMANA", "TIENDA", "CATEGORIA", "TIPO", "SURTIDO", "ENTREGA", "FILL RATE", "CLASIFICACION"] as const;

export interface ParsedMezclaRow {
  semana: string;
  tienda: string;
  categoria: string;
  tipo: string;
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRate: number;
  clasificacion: string;
}

export interface ParseMezclaResult {
  rows: ParsedMezclaRow[];
  errors: string[];
  totalRowsInSheet: number;
  hojaEncontrada: boolean;
}

/**
 * Lee la hoja DATO_MEZCLA, si existe. A diferencia de BASE_MAESTRA, es un
 * reporte independiente — no se cruza ni se mezcla con esos datos.
 * Si la hoja no existe en el archivo, no es un error: simplemente no hay
 * nada que cargar para este reporte.
 */
export function parseMezclaWorkbook(buffer: Buffer): ParseMezclaResult {
  const errors: string[] = [];
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames.includes(HOJA_MEZCLA)) {
    return { rows: [], errors: [], totalRowsInSheet: 0, hojaEncontrada: false };
  }

  const sheet = workbook.Sheets[HOJA_MEZCLA];
  rellenarCeldasCombinadas(sheet);
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (raw.length === 0) {
    return { rows: [], errors: [], totalRowsInSheet: 0, hojaEncontrada: true };
  }

  const sampleKeys = Object.keys(raw[0]);
  const headerMap = new Map(sampleKeys.map((k) => [normalizeHeader(k), k]));

  const missing = REQUIRED_COLUMNS_MEZCLA.filter((c) => !headerMap.has(c));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas requeridas en DATO_MEZCLA: ${missing.join(", ")}`);
  }

  const rows: ParsedMezclaRow[] = [];
  let ultimaSemana = "";
  let ultimaTienda = "";
  let ultimaCategoria = "";
  let ultimoTipo = "";

  raw.forEach((record, i) => {
    const get = (col: string) => record[headerMap.get(col)!];
    const rowNum = i + 2;

    const semanaCelda = get("SEMANA");
    const tiendaCelda = get("TIENDA");
    const categoriaCelda = get("CATEGORIA");
    const tipoCelda = get("TIPO");
    const surtidoCelda = get("SURTIDO");
    const entregaCelda = get("ENTREGA");

    const semana = semanaCelda != null && String(semanaCelda).trim() !== "" ? String(semanaCelda).trim() : ultimaSemana;
    const tienda = tiendaCelda != null && String(tiendaCelda).trim() !== "" ? String(tiendaCelda).trim() : ultimaTienda;
    const categoria = categoriaCelda != null && String(categoriaCelda).trim() !== "" ? String(categoriaCelda).trim() : ultimaCategoria;
    const tipo = tipoCelda != null && String(tipoCelda).trim() !== "" ? String(tipoCelda).trim() : ultimoTipo;

    const filaCompletamenteVacia = !semana && !tienda && !categoria && surtidoCelda == null && entregaCelda == null;
    if (filaCompletamenteVacia) {
      errors.push(`Fila ${rowNum}: fila vacía — se omite.`);
      return;
    }

    if (!semana || !tienda) {
      errors.push(`Fila ${rowNum}: no se pudo determinar semana/tienda — se omite.`);
      return;
    }

    const surtidoNum = surtidoCelda == null || String(surtidoCelda).trim() === "" ? 0 : Number(surtidoCelda);
    const entregaNum = entregaCelda == null || String(entregaCelda).trim() === "" ? 0 : Number(entregaCelda);
    if (Number.isNaN(surtidoNum) || Number.isNaN(entregaNum)) {
      errors.push(`Fila ${rowNum}: surtido o entrega no es numérico — se omite.`);
      return;
    }

    const fillRate = surtidoNum > 0 ? Number(((entregaNum / surtidoNum) * 100).toFixed(2)) : 0;
    const diferencia = entregaNum - surtidoNum;

    ultimaSemana = semana;
    ultimaTienda = tienda;
    ultimaCategoria = categoria;
    ultimoTipo = tipo;

    rows.push({
      semana,
      tienda,
      categoria,
      tipo,
      surtido: surtidoNum,
      entrega: entregaNum,
      diferencia,
      fillRate,
      clasificacion: String(get("CLASIFICACION") ?? "").trim(),
    });
  });

  return { rows, errors, totalRowsInSheet: raw.length, hojaEncontrada: true };
}
