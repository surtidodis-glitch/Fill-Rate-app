import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/config — devuelve el título actual del reporte (crea uno por defecto si no existe) */
export async function GET() {
  const config = await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, titulo: "Fill Rate Analytics" },
  });
  return NextResponse.json(config);
}

/** PUT /api/config { titulo: string } — actualiza el título del reporte */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const titulo = String(body.titulo ?? "").trim();
  if (!titulo) {
    return NextResponse.json({ error: "El título no puede estar vacío." }, { status: 400 });
  }
  const config = await prisma.appConfig.upsert({
    where: { id: 1 },
    update: { titulo },
    create: { id: 1, titulo },
  });
  return NextResponse.json(config);
}
