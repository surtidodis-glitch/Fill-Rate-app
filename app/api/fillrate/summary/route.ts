import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Evita que Next.js intente ejecutar/prerenderizar esta ruta durante el build,
// cuando todavía no hay conexión disponible a la base de datos.
export const dynamic = "force-dynamic";

/**
 * GET /api/fillrate/summary?semana=W27&pais=El%20Salvador&departamento=Ropa
 * Devuelve agregados (KPIs) en la base de datos, no en el navegador.
 * Esto es lo que permite escalar a miles/millones de filas sin que el
 * frontend tenga que descargar y sumar todo por su cuenta.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  const filterFields = ["semana", "pais", "tienda", "departamento", "categoria", "subcategoria"];
  for (const field of filterFields) {
    const value = params.get(field);
    if (value && value !== "Todos" && value !== "Todas") where[field] = value;
  }

  const [agg, porClasificacion, tiendas, porSemana] = await Promise.all([
    prisma.fillRateRecord.aggregate({
      where,
      _sum: { surtido: true, entrega: true, diferencia: true },
      _avg: { fillRate: true },
      _count: true,
    }),
    prisma.fillRateRecord.groupBy({
      by: ["clasificacion"],
      where,
      _sum: { entrega: true },
      _count: true,
    }),
    prisma.fillRateRecord.findMany({ where, distinct: ["tienda"], select: { tienda: true } }),
    prisma.fillRateRecord.groupBy({
      by: ["semana"],
      where,
      _sum: { surtido: true, entrega: true },
      orderBy: { semana: "asc" },
    }),
  ]);

  return NextResponse.json({
    surtido: agg._sum.surtido ?? 0,
    entrega: agg._sum.entrega ?? 0,
    diferencia: agg._sum.diferencia ?? 0,
    fillRatePromedio: Number((agg._avg.fillRate ?? 0).toFixed(2)),
    totalRegistros: agg._count,
    tiendas: tiendas.length,
    porClasificacion: porClasificacion.map((c) => ({
      clasificacion: c.clasificacion,
      entrega: c._sum.entrega ?? 0,
      registros: c._count,
    })),
    porSemana: porSemana.map((s) => {
      const surtido = s._sum.surtido ?? 0;
      const entrega = s._sum.entrega ?? 0;
      return {
        semana: s.semana,
        fillRate: surtido > 0 ? Number(((entrega / surtido) * 100).toFixed(2)) : 0,
      };
    }),
  });
}
