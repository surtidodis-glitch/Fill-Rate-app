import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Evita que Next.js intente ejecutar/prerenderizar esta ruta durante el build,
// cuando todavía no hay conexión disponible a la base de datos.
export const dynamic = "force-dynamic";

/**
 * GET /api/fillrate?semana=W27&pais=El%20Salvador&departamento=Ropa&page=1&pageSize=50
 * Todos los filtros son opcionales. La paginación es obligatoria por defecto
 * para que la tabla nunca intente traer miles de filas de una sola vez.
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

  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize") ?? 50)));

  const [rows, total] = await Promise.all([
    prisma.fillRateRecord.findMany({
      where,
      orderBy: [{ semana: "desc" }, { tienda: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fillRateRecord.count({ where }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}
