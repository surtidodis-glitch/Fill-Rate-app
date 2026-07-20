import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { semanaIsoAMes, extraerNumeroSemana, NOMBRES_MES } from "@/lib/fechas";

export const dynamic = "force-dynamic";

/**
 * GET /api/fillrate/mensual?pais=...&departamento=...
 * Agrupa el Fill Rate por mes calendario, calculado a partir de
 * (número de semana + año) de cada registro — ver lib/fechas.ts
 * para la limitación de este cálculo.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  const filterFields = ["pais", "tienda", "departamento", "categoria", "subcategoria", "clasificacion"];
  for (const field of filterFields) {
    const value = params.get(field);
    if (value && value !== "Todos" && value !== "Todas") where[field] = value;
  }

  const porSemana = await prisma.fillRateRecord.groupBy({
    by: ["semana", "anio"],
    where,
    _sum: { surtido: true, entrega: true },
  });

  const porMes = new Map<string, { anio: number; mes: number; surtido: number; entrega: number }>();

  for (const s of porSemana) {
    const numeroSemana = extraerNumeroSemana(s.semana);
    if (numeroSemana == null) continue;
    const mes = semanaIsoAMes(numeroSemana, s.anio);
    const key = `${s.anio}-${mes}`;
    const acc = porMes.get(key) ?? { anio: s.anio, mes, surtido: 0, entrega: 0 };
    acc.surtido += s._sum.surtido ?? 0;
    acc.entrega += s._sum.entrega ?? 0;
    porMes.set(key, acc);
  }

  const resultado = Array.from(porMes.values())
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
    .map((m) => ({
      mes: `${NOMBRES_MES[m.mes - 1]} ${m.anio}`,
      fillRate: m.surtido > 0 ? Number(((m.entrega / m.surtido) * 100).toFixed(2)) : 0,
    }));

  return NextResponse.json({ porMes: resultado });
}
