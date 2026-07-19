import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/mezcla/filtros
 * Valores únicos para poblar los selects del reporte DATO_MEZCLA.
 */
export async function GET() {
  const [semanas, tiendas, categorias, tipos] = await Promise.all([
    prisma.mezclaRecord.findMany({ distinct: ["semana"], select: { semana: true }, orderBy: { semana: "asc" } }),
    prisma.mezclaRecord.findMany({ distinct: ["tienda"], select: { tienda: true }, orderBy: { tienda: "asc" } }),
    prisma.mezclaRecord.findMany({ distinct: ["categoria"], select: { categoria: true }, orderBy: { categoria: "asc" } }),
    prisma.mezclaRecord.findMany({ distinct: ["tipo"], select: { tipo: true }, orderBy: { tipo: "asc" } }),
  ]);

  return NextResponse.json({
    semanas: semanas.map((s) => s.semana),
    tiendas: tiendas.map((t) => t.tienda),
    categorias: categorias.map((c) => c.categoria),
    tipos: tipos.map((t) => t.tipo),
  });
}
