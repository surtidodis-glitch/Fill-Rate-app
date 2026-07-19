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
  const filterFields = ["semana", "pais", "tienda", "departamento", "categoria", "subcategoria", "clasificacion"];
  for (const field of filterFields) {
    const value = params.get(field);
    if (value && value !== "Todos" && value !== "Todas") where[field] = value;
  }
  const search = params.get("q");
  if (search) {
    where.OR = [
      { tienda: { contains: search, mode: "insensitive" } },
      { categoria: { contains: search, mode: "insensitive" } },
      { subcategoria: { contains: search, mode: "insensitive" } },
    ];
  }

  const [agg, porClasificacion, tiendas, paises, porSemana, porCategoriaRaw, topTiendasRaw] = await Promise.all([
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
    prisma.fillRateRecord.findMany({ where, distinct: ["pais"], select: { pais: true } }),
    prisma.fillRateRecord.groupBy({
      by: ["semana"],
      where,
      _sum: { surtido: true, entrega: true },
      orderBy: { semana: "asc" },
    }),
    prisma.fillRateRecord.groupBy({
      by: ["categoria"],
      where,
      _sum: { entrega: true },
      orderBy: { _sum: { entrega: "desc" } },
    }),
    prisma.fillRateRecord.groupBy({
      by: ["tienda"],
      where,
      _sum: { entrega: true },
      orderBy: { _sum: { entrega: "desc" } },
      take: 10,
    }),
  ]);

  const totalEntregaCategorias = porCategoriaRaw.reduce((a, c) => a + (c._sum.entrega ?? 0), 0);
  const top8 = porCategoriaRaw.slice(0, 8);
  const otrasEntrega = porCategoriaRaw.slice(8).reduce((a, c) => a + (c._sum.entrega ?? 0), 0);
  const porCategoria = [
    ...top8.map((c) => ({
      categoria: c.categoria,
      entrega: c._sum.entrega ?? 0,
      pct: totalEntregaCategorias > 0 ? Number((((c._sum.entrega ?? 0) / totalEntregaCategorias) * 100).toFixed(1)) : 0,
    })),
    ...(otrasEntrega > 0
      ? [
          {
            categoria: "Otras",
            entrega: otrasEntrega,
            pct: totalEntregaCategorias > 0 ? Number(((otrasEntrega / totalEntregaCategorias) * 100).toFixed(1)) : 0,
          },
        ]
      : []),
  ];

  const totalRegistros = agg._count;
  const cumplidos = porClasificacion
    .filter((c) => c.clasificacion === "Completa" || c.clasificacion === "Overfilled")
    .reduce((a, c) => a + c._count, 0);
  const cumplimientoPct = totalRegistros > 0 ? Number(((cumplidos / totalRegistros) * 100).toFixed(2)) : 0;

  return NextResponse.json({
    surtido: agg._sum.surtido ?? 0,
    entrega: agg._sum.entrega ?? 0,
    diferencia: agg._sum.diferencia ?? 0,
    fillRatePromedio: Number((agg._avg.fillRate ?? 0).toFixed(2)),
    cumplimientoPct,
    totalRegistros,
    tiendas: tiendas.length,
    paises: paises.length,
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
    porCategoria,
    topTiendas: topTiendasRaw.map((t) => ({ tienda: t.tienda, entrega: t._sum.entrega ?? 0 })),
  });
}
