import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFillRateWorkbook, parseMezclaWorkbook } from "@/lib/parseExcel";

// Los archivos de fill rate pueden pesar varios MB, subimos el limite del body
export const runtime = "nodejs";
export const maxDuration = 60;
// Evita que Next.js intente ejecutar o prerenderizar esta ruta durante el build,
// cuando todavia no hay conexion disponible a la base de datos.
export const dynamic = "force-dynamic";

/**
 * POST /api/upload  (multipart/form-data, campo "file")
 * Lee BASE_MAESTRA, ignora SV, valida columnas e inserta en lotes.
 * Si el archivo trae la hoja DATO_MEZCLA, también la carga como reporte
 * independiente (no se cruza con BASE_MAESTRA).
 * Cada carga queda registrada en DataLoad para poder auditar o revertir.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const anioForm = formData.get("anio");
  const anio = anioForm ? parseInt(String(anioForm), 10) : undefined;

  let parsed;
  try {
    parsed = parseFillRateWorkbook(buffer, anio);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }

  const { rows, errors, totalRowsInSheet } = parsed;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas para cargar.", detalles: errors },
      { status: 422 }
    );
  }

  const load = await prisma.dataLoad.create({
    data: {
      fileName: file.name,
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
    }
    await prisma.dataLoad.update({ where: { id: load.id }, data: { status: "completado" } });
  } catch (err) {
    await prisma.dataLoad.update({
      where: { id: load.id },
      data: { status: "error", errorLog: String(err) },
    });
    return NextResponse.json({ error: "Error al insertar en la base de datos." }, { status: 500 });
  }

  // DATO_MEZCLA es opcional: si no viene en el archivo, se omite sin error.
  let mezclaResumen = null;
  const mezcla = parseMezclaWorkbook(buffer);
  if (mezcla.hojaEncontrada && mezcla.rows.length > 0) {
    const mezclaLoad = await prisma.dataLoad.create({
      data: {
        fileName: `${file.name} (DATO_MEZCLA)`,
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
      }
      await prisma.dataLoad.update({ where: { id: mezclaLoad.id }, data: { status: "completado" } });
      mezclaResumen = { loadId: mezclaLoad.id, filasInsertadas: mezcla.rows.length, advertencias: mezcla.errors };
    } catch (err) {
      await prisma.dataLoad.update({
        where: { id: mezclaLoad.id },
        data: { status: "error", errorLog: String(err) },
      });
    }
  }

  return NextResponse.json({
    loadId: load.id,
    totalRowsInSheet,
    filasInsertadas: rows.length,
    advertencias: errors,
    mezcla: mezclaResumen,
  });
}
