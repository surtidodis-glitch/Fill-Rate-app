"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Truck,
  Target,
  Store,
  Globe2,
  Search,
  UploadCloud,
  Loader2,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F5A524";
const RED = "#EF4444";
const PURPLE = "#8B5CF6";
const CYAN = "#22D3EE";
const DONUT_COLORS = [CYAN, PURPLE, BLUE, GREEN, AMBER, "#EC4899", "#14B8A6", "#F97316", "#64748B"];

const STATUS_COLOR: Record<string, string> = {
  Overfilled: AMBER,
  Completa: GREEN,
  Básico: BLUE,
  Undersized: RED,
  Cero: "#64748B",
};

interface Filtros {
  semanas: string[];
  paises: string[];
  departamentos: string[];
  tiendas: string[];
  categorias: string[];
  subcategorias: string[];
  clasificaciones: string[];
}

interface Summary {
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRatePromedio: number;
  cumplimientoPct: number;
  totalRegistros: number;
  tiendas: number;
  paises: number;
  porClasificacion: { clasificacion: string; entrega: number; registros: number }[];
  porSemana: { semana: string; fillRate: number }[];
  porCategoria: { categoria: string; entrega: number; pct: number }[];
  topTiendas: { tienda: string; entrega: number }[];
}

interface Row {
  id: number;
  semana: string;
  pais: string;
  tienda: string;
  departamento: string;
  categoria: string;
  subcategoria: string;
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRate: number;
  clasificacion: string;
}

interface MezclaRow {
  id: number;
  semana: string;
  tienda: string;
  categoria: string;
  tipo: string;
  surtido: number;
  entrega: number;
  diferencia: number;
  fillRate: number;
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
        <div className="text-[10px] tracking-wide text-[#8891A5] uppercase truncate">{label}</div>
        <div className="text-xl font-semibold text-[#E7E9F0] font-mono tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative rounded-lg border border-[#1E2438] bg-[#12172A] px-3 py-1.5 flex items-center gap-3 text-xs">
      <div className="min-w-0">
        <span className="text-[#8891A5]">{label}: </span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[#E7E9F0] outline-none appearance-none pr-4">
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
      <ChevronDown className="h-3.5 w-3.5 text-[#8891A5] absolute right-2 pointer-events-none" />
    </div>
  );
}

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({
    semanas: [],
    paises: [],
    departamentos: [],
    tiendas: [],
    categorias: [],
    subcategorias: [],
    clasificaciones: [],
  });
  const [semana, setSemana] = useState("Todos");
  const [pais, setPais] = useState("Todos");
  const [departamento, setDepartamento] = useState("Todos");
  const [tienda, setTienda] = useState("Todos");
  const [categoria, setCategoria] = useState("Todos");
  const [subcategoria, setSubcategoria] = useState("Todos");
  const [clasificacion, setClasificacion] = useState("Todos");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [categoriaVista, setCategoriaVista] = useState<"donut" | "barras">("donut");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [mezclaRows, setMezclaRows] = useState<MezclaRow[]>([]);
  const [mezclaLoading, setMezclaLoading] = useState(false);

  useEffect(() => {
    fetch("/api/fillrate/filtros")
      .then((r) => r.json())
      .then(setFiltros)
      .catch(() => {});
  }, []);

  const limpiarFiltros = () => {
    setSemana("Todos");
    setPais("Todos");
    setDepartamento("Todos");
    setTienda("Todos");
    setCategoria("Todos");
    setSubcategoria("Todos");
    setClasificacion("Todos");
    setQuery("");
  };

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (semana !== "Todos") p.set("semana", semana);
    if (pais !== "Todos") p.set("pais", pais);
    if (departamento !== "Todos") p.set("departamento", departamento);
    if (tienda !== "Todos") p.set("tienda", tienda);
    if (categoria !== "Todos") p.set("categoria", categoria);
    if (subcategoria !== "Todos") p.set("subcategoria", subcategoria);
    if (clasificacion !== "Todos") p.set("clasificacion", clasificacion);
    return p;
  }, [semana, pais, departamento, tienda, categoria, subcategoria, clasificacion]);

  useEffect(() => {
    setPage(1);
  }, [semana, pais, departamento, tienda, categoria, subcategoria, clasificacion, debouncedQuery]);

  useEffect(() => {
    const p = new URLSearchParams(filterParams);
    if (debouncedQuery) p.set("q", debouncedQuery);
    fetch(`/api/fillrate/summary?${p.toString()}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, [filterParams, debouncedQuery]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams(filterParams);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (debouncedQuery) p.set("q", debouncedQuery);

    fetch(`/api/fillrate?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setPageCount(data.pageCount ?? 1);
      })
      .finally(() => setLoading(false));
  }, [filterParams, page, debouncedQuery]);

  useEffect(() => {
    if (tienda === "Todos") {
      setMezclaRows([]);
      return;
    }
    setMezclaLoading(true);
    const p = new URLSearchParams();
    p.set("tienda", tienda);
    if (categoria !== "Todos") p.set("categoria", categoria);
    p.set("pageSize", "50");

    fetch(`/api/mezcla?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => setMezclaRows(data.rows ?? []))
      .finally(() => setMezclaLoading(false));
  }, [tienda, categoria]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg(`Error: ${data.error ?? "no se pudo cargar el archivo"}`);
      } else {
        setUploadMsg(`Cargado: ${data.filasInsertadas} filas nuevas`);
        setPage(1);
        const p = new URLSearchParams(filterParams);
        fetch(`/api/fillrate/summary?${p.toString()}`).then((r) => r.json()).then(setSummary);
        fetch("/api/fillrate/filtros").then((r) => r.json()).then(setFiltros);
      }
    } catch {
      setUploadMsg("Error de red al subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  const departamentosSidebar = ["Todos", ...filtros.departamentos];

  return (
    <div className="min-h-screen w-full bg-[#0A0E1A] text-[#E7E9F0] flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <aside className="w-56 shrink-0 bg-[#0A0E1A] border-r border-[#1E2438] flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-[#1E2438]">
          <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide leading-none">Fill Rate</div>
            <div className="text-[10px] text-[#8891A5] mt-0.5">Analytics</div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-1 text-[10px] tracking-widest text-[#8891A5] uppercase">Departamentos</div>
        <nav className="px-3 space-y-0.5 text-sm">
          {departamentosSidebar.map((d) => (
            <button
              key={d}
              onClick={() => setDepartamento(d)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left ${
                departamento === d ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "text-[#8891A5] hover:bg-white/5"
              }`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="truncate">{d}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 border-t border-[#1E2438] space-y-1">
          <a href="/mezcla" className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[#8891A5] hover:bg-white/5 text-sm">
            <ArrowRightLeft className="h-4 w-4" /> DATO_MEZCLA
          </a>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-[#1E2438] flex items-center justify-between px-6">
          <div className="text-lg font-semibold">Fill Rate Analytics</div>
          <label className="flex items-center gap-2 rounded-lg border border-[#1E2438] px-3 py-1.5 text-xs cursor-pointer hover:bg-white/5">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {uploading ? "Cargando..." : "Cargar otro archivo"}
            <input
              type="file"
              accept=".xlsx,.xls,.xlsb"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </header>
        {uploadMsg && (
          <div className="px-6 pt-3 text-xs text-[#8891A5] flex items-center gap-2">
            {uploadMsg}
            <button onClick={() => setUploadMsg(null)} className="text-[#8891A5] hover:text-[#E7E9F0]">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect label="Semana" value={semana} options={filtros.semanas} onChange={setSemana} />
            <FilterSelect label="País" value={pais} options={filtros.paises} onChange={setPais} />
            <FilterSelect label="Tienda" value={tienda} options={filtros.tiendas} onChange={setTienda} />
            <FilterSelect label="Categoría" value={categoria} options={filtros.categorias} onChange={setCategoria} />
            <FilterSelect label="Subcategoría" value={subcategoria} options={filtros.subcategorias} onChange={setSubcategoria} />
            <FilterSelect label="Clasificación" value={clasificacion} options={filtros.clasificaciones} onChange={setClasificacion} />
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8891A5]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tienda, categoría..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#12172A] border border-[#1E2438] rounded-lg text-[#E7E9F0] placeholder:text-[#8891A5] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] w-52"
              />
            </div>
            <button onClick={limpiarFiltros} className="flex items-center gap-1.5 rounded-lg border border-[#1E2438] px-3 py-1.5 text-xs text-[#8891A5] hover:bg-white/5">
              Limpiar
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <KpiCard icon={Package} iconColor={BLUE} label="Surtido" value={(summary?.surtido ?? 0).toLocaleString("es")} />
            <KpiCard icon={Truck} iconColor={CYAN} label="Entregado" value={(summary?.entrega ?? 0).toLocaleString("es")} />
            <KpiCard icon={Target} iconColor={GREEN} label="Cumplimiento" value={`${summary?.cumplimientoPct ?? 0}%`} />
            <KpiCard icon={Store} iconColor={PURPLE} label="Tiendas" value={String(summary?.tiendas ?? 0)} />
            <KpiCard icon={Globe2} iconColor={AMBER} label="Países" value={String(summary?.paises ?? 0)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#1E2438] bg-[#12172A] p-4">
              <div className="text-sm font-medium mb-1">Top 10 tiendas con mayor entrega</div>
              <div className="text-[11px] text-[#8891A5] mb-3">Unidades entregadas, de mayor a menor</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary?.topTiendas ?? []} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#8891A5" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tienda" tick={{ fontSize: 11, fill: "#8891A5" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="entrega" radius={[0, 4, 4, 0]} fill={BLUE} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#1E2438] bg-[#12172A] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium">Entregado por Categoría</div>
                  <div className="text-[11px] text-[#8891A5]">Top 8 + Otras</div>
                </div>
                <div className="flex rounded-lg border border-[#1E2438] overflow-hidden text-[11px]">
                  <button onClick={() => setCategoriaVista("donut")} className={`px-2.5 py-1 ${categoriaVista === "donut" ? "bg-[#3B82F6] text-white" : "text-[#8891A5]"}`}>
                    Donut
                  </button>
                  <button onClick={() => setCategoriaVista("barras")} className={`px-2.5 py-1 ${categoriaVista === "barras" ? "bg-[#3B82F6] text-white" : "text-[#8891A5]"}`}>
                    Barras
                  </button>
                </div>
              </div>
              {categoriaVista === "donut" ? (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={150} height={220}>
                    <PieChart>
                      <Pie data={summary?.porCategoria ?? []} dataKey="entrega" nameKey="categoria" innerRadius={45} outerRadius={72} paddingAngle={2}>
                        {(summary?.porCategoria ?? []).map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#12172A" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-[11px] space-y-1 flex-1 min-w-0">
                    {(summary?.porCategoria ?? []).map((c, i) => (
                      <div key={c.categoria} className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="text-[#8891A5] truncate">{c.categoria}</span>
                        <span className="ml-auto text-[#E7E9F0] shrink-0">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary?.porCategoria ?? []} margin={{ left: -10 }}>
                    <XAxis dataKey="categoria" tick={{ fontSize: 9, fill: "#8891A5" }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10, fill: "#8891A5" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid #1E2438", fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="entrega" radius={[4, 4, 0, 0]}>
                      {(summary?.porCategoria ?? []).map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {tienda !== "Todos" && (
            <div className="rounded-xl border border-[#3B82F6]/30 bg-[#12172A] p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="h-4 w-4 text-[#3B82F6]" />
                <div className="text-sm font-medium">
                  Mezcla de {tienda}
                  {categoria !== "Todos" ? ` — ${categoria}` : ""}
                </div>
              </div>
              {mezclaLoading ? (
                <div className="text-xs text-[#8891A5] py-4 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando mezcla...
                </div>
              ) : mezclaRows.length === 0 ? (
                <div className="text-xs text-[#8891A5] py-4">
                  No hay datos de DATO_MEZCLA para esta tienda{categoria !== "Todos" ? " y categoría" : ""}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[#8891A5] border-b border-[#1E2438]">
                        <th className="py-2 pr-3 font-medium">Semana</th>
                        <th className="py-2 pr-3 font-medium">Categoría</th>
                        <th className="py-2 pr-3 font-medium">Tipo</th>
                        <th className="py-2 pr-3 font-medium text-right">Surtido</th>
                        <th className="py-2 pr-3 font-medium text-right">Entregado</th>
                        <th className="py-2 pr-3 font-medium text-right">Diferencia</th>
                        <th className="py-2 font-medium">Fill Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mezclaRows.map((m) => (
                        <tr key={m.id} className="border-b border-[#161C2E]">
                          <td className="py-2 pr-3 font-mono text-[#8891A5]">{m.semana}</td>
                          <td className="py-2 pr-3 text-[#8891A5]">{m.categoria}</td>
                          <td className="py-2 pr-3">{m.tipo}</td>
                          <td className="py-2 pr-3 text-right font-mono">{m.surtido.toLocaleString("es")}</td>
                          <td className="py-2 pr-3 text-right font-mono">{m.entrega.toLocaleString("es")}</td>
                          <td className="py-2 pr-3 text-right font-mono" style={{ color: m.diferencia < 0 ? RED : m.diferencia > 0 ? GREEN : "#8891A5" }}>
                            {m.diferencia > 0 ? "+" : ""}
                            {m.diferencia.toLocaleString("es")}
                          </td>
                          <td className="py-2 font-mono">{m.fillRate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-[#1E2438] bg-[#12172A]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2438]">
              <span className="text-sm font-medium">Detalle de Registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#8891A5] border-b border-[#1E2438]">
                    <th className="px-4 py-2.5 font-medium">Semana</th>
                    <th className="px-3 py-2.5 font-medium">País</th>
                    <th className="px-3 py-2.5 font-medium">Tienda</th>
                    <th className="px-3 py-2.5 font-medium">Departamento</th>
                    <th className="px-3 py-2.5 font-medium">Categoría</th>
                    <th className="px-3 py-2.5 font-medium text-right">Surtido</th>
                    <th className="px-3 py-2.5 font-medium text-right">Entregado</th>
                    <th className="px-3 py-2.5 font-medium text-right">Diferencia</th>
                    <th className="px-3 py-2.5 font-medium">Fill Rate</th>
                    <th className="px-3 py-2.5 font-medium">Clasificación</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-[#8891A5]">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Cargando...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-[#8891A5]">
                        Sin registros para estos filtros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-[#161C2E] hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5 font-mono text-[#8891A5]">{r.semana}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.pais}</td>
                        <td className="px-3 py-2.5">
                          <button className="hover:text-[#3B82F6]" onClick={() => setTienda(r.tienda)}>
                            {r.tienda}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.departamento}</td>
                        <td className="px-3 py-2.5 text-[#8891A5]">{r.categoria}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.surtido.toLocaleString("es")}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.entrega.toLocaleString("es")}</td>
                        <td className="px-3 py-2.5 text-right font-mono" style={{ color: r.diferencia < 0 ? RED : r.diferencia > 0 ? GREEN : "#8891A5" }}>
                          {r.diferencia > 0 ? "+" : ""}
                          {r.diferencia.toLocaleString("es")}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{r.fillRate.toFixed(2)}%</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: `${STATUS_COLOR[r.clasificacion] ?? BLUE}22`, color: STATUS_COLOR[r.clasificacion] ?? BLUE }}
                          >
                            {r.clasificacion}
                          </span>
                        </td>
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono">
                  {page} / {pageCount}
                </span>
                <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="h-7 w-7 rounded-md border border-[#1E2438] flex items-center justify-center hover:bg-white/5 disabled:opacity-30">
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
