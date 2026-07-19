import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/fillrate/filtros
 * Devuelve los valores únicos disponibles para poblar los selects de filtro
 * (semana, país, departamento, tienda), en vez de traer todas las filas
 * al navegador solo para armar una lista de opciones.
 */
export async function GET() {
  const [semanas, paises, departamentos, tiendas, categorias, subcategorias, clasificaciones] = await Promise.all([
    prisma.fillRateRecord.findMany({ distinct: ["semana"], select: { semana: true }, orderBy: { semana: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["pais"], select: { pais: true }, orderBy: { pais: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["departamento"], select: { departamento: true }, orderBy: { departamento: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["tienda"], select: { tienda: true }, orderBy: { tienda: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["categoria"], select: { categoria: true }, orderBy: { categoria: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["subcategoria"], select: { subcategoria: true }, orderBy: { subcategoria: "asc" } }),
    prisma.fillRateRecord.findMany({ distinct: ["clasificacion"], select: { clasificacion: true }, orderBy: { clasificacion: "asc" } }),
  ]);

  return NextResponse.json({
    semanas: semanas.map((s) => s.semana),
    paises: paises.map((p) => p.pais),
    departamentos: departamentos.map((d) => d.departamento),
    tiendas: tiendas.map((t) => t.tienda),
    categorias: categorias.map((c) => c.categoria).filter(Boolean),
    subcategorias: subcategorias.map((s) => s.subcategoria).filter(Boolean),
    clasificaciones: clasificaciones.map((c) => c.clasificacion).filter(Boolean),
  });
}
