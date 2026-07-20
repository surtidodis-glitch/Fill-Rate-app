/**
 * Script de ingesta manual.
 * Uso: npm run ingest -- ./ruta/al/archivo.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { parseFillRateWorkbook, parseMezclaWorkbook } from "../lib/parseExcel";

async function main() {
  const filePath = process.argv[2];
  const anioArg = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
  if (!filePath) {
    console.error("Uso: npm run ingest -- ./ruta/al/archivo.xlsx [año]");
    process.exit(1);
  }

  const buffer = fs.readFileSync(path.resolve(filePath));

  // --- BASE_MAESTRA ---
  const { rows, errors, totalRowsInSheet } = parseFillRateWorkbook(buffer, anioArg);

  console.log(`BASE_MAESTRA — filas leídas: ${totalRowsInSheet}, válidas: ${rows.length}`);
  if (errors.length) {
    console.warn(`Advertencias (${errors.length}):`);
    errors.slice(0, 20).forEach((e) => console.warn("  - " + e));
    if (errors.length > 20) console.warn(`  ... y ${errors.length - 20} más`);
  }

  const load = await prisma.dataLoad.create({
    data: {
      fileName: path.basename(filePath),
      rowCount: rows.length,
      status: "procesando",
      errorLog: errors.length ? errors.join("\n") : null,
    },
  });

  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r, loadId: load.id }));
      await prisma.fillRateRecord.createMany({ data: batch });
      console.log(`  BASE_MAESTRA: insertadas ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }
    await prisma.dataLoad.update({ where: { id: load.id }, data: { status: "completado" } });
    console.log(`Carga BASE_MAESTRA (${load.id}) completada.`);
  } catch (err) {
    await prisma.dataLoad.update({ where: { id: load.id }, data: { status: "error", errorLog: String(err) } });
    throw err;
  }

  // --- DATO_MEZCLA (reporte separado, opcional) ---
  const mezcla = parseMezclaWorkbook(buffer);
  if (!mezcla.hojaEncontrada) {
    console.log("No se encontró la hoja DATO_MEZCLA en este archivo — se omite ese reporte.");
    return;
  }

  console.log(`\nDATO_MEZCLA — filas leídas: ${mezcla.totalRowsInSheet}, válidas: ${mezcla.rows.length}`);
  if (mezcla.errors.length) {
    console.warn(`Advertencias (${mezcla.errors.length}):`);
    mezcla.errors.slice(0, 20).forEach((e) => console.warn("  - " + e));
    if (mezcla.errors.length > 20) console.warn(`  ... y ${mezcla.errors.length - 20} más`);
  }

  const mezclaLoad = await prisma.dataLoad.create({
    data: {
      fileName: `${path.basename(filePath)} (DATO_MEZCLA)`,
      rowCount: mezcla.rows.length,
      status: "procesando",
      errorLog: mezcla.errors.length ? mezcla.errors.join("\n") : null,
    },
  });

  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < mezcla.rows.length; i += BATCH_SIZE) {
      const batch = mezcla.rows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r, loadId: mezclaLoad.id }));
      await prisma.mezclaRecord.createMany({ data: batch });
      console.log(`  DATO_MEZCLA: insertadas ${Math.min(i + BATCH_SIZE, mezcla.rows.length)} / ${mezcla.rows.length}`);
    }
    await prisma.dataLoad.update({ where: { id: mezclaLoad.id }, data: { status: "completado" } });
    console.log(`Carga DATO_MEZCLA (${mezclaLoad.id}) completada.`);
  } catch (err) {
    await prisma.dataLoad.update({ where: { id: mezclaLoad.id }, data: { status: "error", errorLog: String(err) } });
    throw err;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
