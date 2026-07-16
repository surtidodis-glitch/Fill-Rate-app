/**
 * Exporta a un archivo de texto todas las advertencias (filas omitidas)
 * de la última carga de Excel, para poder revisarlas con calma.
 *
 * Uso: npm run ver-omitidas
 */
import fs from "node:fs";
import { prisma } from "../lib/db";

async function main() {
  const lastLoad = await prisma.dataLoad.findFirst({
    orderBy: { uploadedAt: "desc" },
  });

  if (!lastLoad) {
    console.log("No hay ninguna carga registrada todavía.");
    return;
  }

  console.log(`Última carga: ${lastLoad.fileName} (${lastLoad.uploadedAt.toLocaleString("es")})`);
  console.log(`Filas insertadas: ${lastLoad.rowCount}`);

  if (!lastLoad.errorLog) {
    console.log("Esta carga no tuvo advertencias.");
    return;
  }

  const lines = lastLoad.errorLog.split("\n");
  console.log(`Filas omitidas: ${lines.length}`);

  const outPath = "omitidas.txt";
  fs.writeFileSync(outPath, lastLoad.errorLog, "utf8");
  console.log(`\nLista completa guardada en: ${outPath}`);
  console.log(`Ábrelo con: notepad ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
