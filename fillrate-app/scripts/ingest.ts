/**
 * Script de ingesta manual.
 * Uso: npm run ingest -- ./ruta/al/archivo.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { parseFillRateWorkbook } from "../lib/parseExcel";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: npm run ingest -- ./ruta/al/archivo.xlsx");
    process.exit(1);
  }

  const buffer = fs.readFileSync(path.resolve(filePath));
  const { rows, errors, totalRowsInSheet } = parseFillRateWorkbook(buffer);

  console.log(`Filas leídas en BASE_MAESTRA: ${totalRowsInSheet}`);
  console.log(`Filas válidas: ${rows.length}`);
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
    // createMany en lotes para no exceder límites de la BD con miles de filas
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r, loadId: load.id }));
      await prisma.fillRateRecord.createMany({ data: batch });
      console.log(`Insertadas ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }

    await prisma.dataLoad.update({ where: { id: load.id }, data: { status: "completado" } });
    console.log(`Carga ${load.id} completada.`);
  } catch (err) {
    await prisma.dataLoad.update({
      where: { id: load.id },
      data: { status: "error", errorLog: String(err) },
    });
    throw err;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
