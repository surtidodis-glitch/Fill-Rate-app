/**
 * Borra todos los registros (BASE_MAESTRA y DATO_MEZCLA) sin tocar el
 * esquema de la base de datos. Más rápido que `prisma migrate reset`
 * porque no vuelve a aplicar las migraciones desde cero.
 *
 * Uso: npm run limpiar-datos
 */
import { prisma } from "../lib/db";

async function main() {
  const mezcla = await prisma.mezclaRecord.deleteMany({});
  const fillrate = await prisma.fillRateRecord.deleteMany({});
  const cargas = await prisma.dataLoad.deleteMany({});

  console.log(`Borrados: ${fillrate.count} registros de BASE_MAESTRA`);
  console.log(`Borrados: ${mezcla.count} registros de DATO_MEZCLA`);
  console.log(`Borrados: ${cargas.count} registros de historial de cargas`);
  console.log("Listo. La base de datos quedó vacía, lista para una carga limpia.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
