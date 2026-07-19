"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Truck,
  Percent,
  Store,
  Search,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const RED = "#EF4444";
const COLORS = [BLUE, "#8B5CF6", "#22D3EE", "#F5A524", GREEN];

interface Filtros {
  semanas: string[];
  tiendas: string[];
  categorias: string[];
  tipos: string[];
}

interface Summary {
  surtido: number;
  entrega: number;
  fillRatePromedio: number;
  totalRegistros: number;
  tiendas: number;
  porTipo: { tipo: string; entrega: number; registros: number }[];
}

interface Row {
  id: number;
  semana: string;
  tienda: string;
  categoria: string;
  tipo: string;
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRate: number;
  clasificacion: string;
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function KpiCard({ icon: Icon, iconColor, label, value }: { icon: React.ElementType; iconColor: string; label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-[#1E2438] bg-[#12172A] p-4 flex items-center gap-3 min-w-0">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${iconColor}22` }}>
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#8891A5] truncate">{label}</div>
        <div className="text-xl font-semibold text-[#E7E9F0] font-mono tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative rounded-lg border border-[#1E2438] bg-[#12172A] px-3 py-1.5 flex items-center gap-3 text-xs">
      <div className="min-w-0">
        <div className="text-[#8891A5]">{label}</div>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[#E7E9F0] outline-none appearance-none pr-4 max-w-[140px]">
          <option className="bg-[#12172A]" value="Todos">
            Todos
          </option>
          {options.map((o) => (
            <option className="bg-[#12172A]" key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-[#8891A5] absolute right-2" />
    </div>
  );
}

export default function MezclaPage() {
  const [filtros, setFiltros] = useState<Filtros>({ semanas: [], tiendas: [], categorias: [], tipos: [] });
  const [semana, setSemana] = useState("Todos");
  const [tienda, setTienda] = useState("Todos");
  const [categoria, setCategoria] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mezcla/filtros")
      .then((r) => r.json())
      .then(setFiltros)
      .catch(() => {});
  }, []);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (semana !== "Todos") p.set("semana", semana);
    if (tienda !== "Todos") p.set("tienda", tienda);
    if (categoria !== "Todos") p.set("categoria", categoria);
    if (tipo !== "Todos") p.set("tipo", tipo);
    return p;
  }, [semana, tienda, categoria, tipo]);

  useEffect(() => {
    setPage(1);
  }, [semana, tienda, categoria, tipo, debouncedQuery]);

  useEffect(() => {
    fetch(`/api/mezcla/summary?${filterParams.toString()}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [filterParams]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams(filterParams);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (debouncedQuery) p.set("q", debouncedQuery);

    fetch(`/api/mezcla?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setPageCount(data.pageCount ?? 1);
      })
      .finally(() => setLoading(false));
  }, [filterParams, page, debouncedQuery]);

  return (
    <div className="min-h-screen w-full bg-[#0A0E1A] text-[#E7E9F0] flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <aside className="w-56 shrink-0 bg-[#0A0E1A] border-r border-[#1E2438] flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-[#1E2438]">
          <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide leading-none">FILL RATE</div>
            <div className="text-[10px] text-[#8891A5] mt-0.5">Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5 text-sm">
          <a href="/" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[#8891A5] hover:bg-white/5">
            <LayoutGrid className="h-4 w-4" /> BASE_MAESTRA
          </a>
          <a href="/mezcla" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[#3B82F6]/15 text-[#3B82F6]">
            <ArrowRightLeft className="h-4 w-4" /> DATO_MEZCLA
          </a>
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-[#1E2438] flex items-center px-6">
          <div>
            <div className="text-base font-semibold leading-tight">DATO_MEZCLA</div>
            <div className="text-xs text-[#8891A5]">Reporte independiente, desglosado por Tipo</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect label="Semana" value={semana} options={filtros.semanas} onChange={setSemana} />
            <FilterSelect label="Tienda" value={tienda} options={filtros.tiendas} onChange={setTienda} />
            <FilterSelect label="Categoría" value={categoria} options={filtros.categorias} onChange={setCategoria} />
            <FilterSelect label="Tipo" value={tipo} options={filtros.tipos} onChange={setTipo} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <KpiCard icon={Package} iconColor={BLUE} label="Surtido" value={(summary?.surtido ?? 0).toLocaleString("es")} />
            <KpiCard icon={Truck} iconColor="#22D3EE" label="Entregado" value={(summary?.entrega ?? 0).toLocaleString("es")} />
            <KpiCard icon={Percent} iconColor={GREEN} label="Fill Rate" value={`${summary?.fillRatePromedio ?? 0}%`} />
            <KpiCard icon={Store} iconColor="#8B5CF6" label="Tiendas" value={String(summary?.tiendas ?? 0)} />
          </div>

          <div className="rounded-xl border border-[#1E2438] bg-[#12172A] p-4">
            <div className="text-sm font-medium mb-3">Entregado por Tipo</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary?.porTipo ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: "#8891A5" }} axisLine={{ stroke: "#1E2438" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8891A5" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#12172A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="entrega" radius={[6, 6, 0, 0]}>
                  {(summary?.porTipo ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-[#1E2438] bg-[#12172A]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2438]">
              <span className="text-sm font-medium">Detalle</span>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8891A5]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tienda, tipo..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#0A0E1A] border border-[#1E2438] rounded-lg text-[#E7E9F0] placeholder:text-[#8891A5] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] w-56"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#8891A5] border-b border-[#1E2438]">
                    <th className="px-4 py-2.5 font-medium">Semana</th>
                    <th className="px-3 py-2.5 font-medium">Tienda</th>
                    <th className="px-3 py-2.5 font-medium">Categoría</th>
                    <th className="px-3 py-2.5 font-medium">Tipo</th>
                    <th className="px-3 py-2.5 font-medium text-right">Surtido</th>
                    <th className="px-3 py-2.5 font-medium text-right">Entregado</th>
                    <th className="px-3 py-2.5 font-medium text-right">Diferencia</th>
                    <th className="px-3 py-2.5 font-medium">Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-[#8891A5]">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Cargando...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-[#8891A5]">
                        Sin registros para estos filtros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-[#161C2E] hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5 font-mono text-[#8891A5]">{r.semana}</td>
                        <td className="px-3 py-2.5">{r.tienda}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.categoria}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.tipo}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.surtido.toLocaleString("es")}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.entrega.toLocaleString("es")}</td>
                        <td
                          className="px-3 py-2.5 text-right font-mono"
                          style={{ color: r.diferencia < 0 ? RED : r.diferencia > 0 ? GREEN : "#8891A5" }}
                        >
                          {r.diferencia > 0 ? "+" : ""}
                          {r.diferencia.toLocaleString("es")}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{r.fillRate.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-[#8891A5]">
              <span>
                {total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)} de {total.toLocaleString("es")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono">
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
