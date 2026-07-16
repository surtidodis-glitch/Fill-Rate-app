import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/mezcla/summary?semana=W27&tienda=PC21&categoria=Ropa%20Color&tipo=Credencial
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  const filterFields = ["semana", "tienda", "categoria", "tipo"];
  for (const field of filterFields) {
    const value = params.get(field);
    if (value && value !== "Todos" && value !== "Todas") where[field] = value;
  }

  const [agg, porTipo, tiendas] = await Promise.all([
    prisma.mezclaRecord.aggregate({
      where,
      _sum: { surtido: true, entrega: true },
      _avg: { fillRate: true },
      _count: true,
    }),
    prisma.mezclaRecord.groupBy({
      by: ["tipo"],
      where,
      _sum: { entrega: true },
      _count: true,
    }),
    prisma.mezclaRecord.findMany({ where, distinct: ["tienda"], select: { tienda: true } }),
  ]);

  return NextResponse.json({
    surtido: agg._sum.surtido ?? 0,
    entrega: agg._sum.entrega ?? 0,
    fillRatePromedio: Number((agg._avg.fillRate ?? 0).toFixed(2)),
    totalRegistros: agg._count,
    tiendas: tiendas.length,
    porTipo: porTipo.map((t) => ({ tipo: t.tipo, entrega: t._sum.entrega ?? 0, registros: t._count })),
  });
}
