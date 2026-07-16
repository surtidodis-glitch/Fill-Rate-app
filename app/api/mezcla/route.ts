import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/mezcla?semana=W27&tienda=PC21&categoria=Ropa%20Color&tipo=Credencial&page=1&pageSize=50
 * Reporte independiente de BASE_MAESTRA, proveniente de la hoja DATO_MEZCLA.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const where: Record<string, unknown> = {};
  const filterFields = ["semana", "tienda", "categoria", "tipo", "clasificacion"];
  for (const field of filterFields) {
    const value = params.get(field);
    if (value && value !== "Todos" && value !== "Todas") where[field] = value;
  }

  const search = params.get("q");
  if (search) {
    where.OR = [
      { tienda: { contains: search, mode: "insensitive" } },
      { categoria: { contains: search, mode: "insensitive" } },
      { tipo: { contains: search, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize") ?? 50)));

  const [rows, total] = await Promise.all([
    prisma.mezclaRecord.findMany({
      where,
      orderBy: [{ semana: "desc" }, { tienda: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.mezclaRecord.count({ where }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}
