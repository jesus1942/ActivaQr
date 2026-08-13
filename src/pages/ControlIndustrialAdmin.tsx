import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Cpu, RadioTower, Save, Search, ShieldCheck, SlidersHorizontal, Snowflake } from 'lucide-react';
import { configurarControlAdmin, EmpresaControlAdmin, EstadoModuloControl, listarControlAdmin, ModuloControl } from '../data/controlIndustrialApi';
import { useToast } from '../components/ui/Toast';
import { DialogViewport } from '../components/ui/DialogViewport';

type Form = Pick<ModuloControl, 'estado' | 'nombreServicio' | 'cargoImplementacionUsd' | 'abonoMensualUsd' | 'monedaFacturacion' | 'limiteDispositivos' | 'limiteGateways' | 'retencionDias' | 'umbralSinConexionMinutos' | 'controlRemotoHabilitado' | 'notasComerciales' | 'tableroConfig'>;

const initialForm = (empresa: EmpresaControlAdmin): Form => ({
  estado: empresa.moduloControl?.estado ?? 'configuracion',
  nombreServicio: empresa.moduloControl?.nombreServicio ?? 'ActivaQR Control',
  cargoImplementacionUsd: empresa.moduloControl?.cargoImplementacionUsd ?? null,
  abonoMensualUsd: empresa.moduloControl?.abonoMensualUsd ?? null,
  monedaFacturacion: empresa.moduloControl?.monedaFacturacion ?? 'USD',
  limiteDispositivos: empresa.moduloControl?.limiteDispositivos ?? 25,
  limiteGateways: empresa.moduloControl?.limiteGateways ?? 2,
  retencionDias: empresa.moduloControl?.retencionDias ?? 365,
  umbralSinConexionMinutos: empresa.moduloControl?.umbralSinConexionMinutos ?? 10,
  controlRemotoHabilitado: empresa.moduloControl?.controlRemotoHabilitado ?? false,
  notasComerciales: empresa.moduloControl?.notasComerciales ?? '',
  tableroConfig: empresa.moduloControl?.tableroConfig ?? { titulo: empresa.nombre, subtitulo: 'Supervisión de cadena de frío', refreshSeconds: 5, mostrarBateria: true, mostrarSenal: true },
});

export const ControlIndustrialAdmin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaControlAdmin[]>([]);
  const [selected, setSelected] = useState<EmpresaControlAdmin | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setEmpresas(await listarControlAdmin()); }
    catch (error) { toast(error instanceof Error ? error.message : 'No se pudo cargar Control.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => empresas.filter((item) => item.nombre.toLowerCase().includes(query.toLowerCase())), [empresas, query]);
  const activos = empresas.filter((item) => item.moduloControl?.estado === 'activo').length;
  const dispositivos = empresas.reduce((sum, item) => sum + item._count.dispositivosIoT, 0);
  const alarmas = empresas.reduce((sum, item) => sum + item._count.alarmasIoT, 0);

  const open = (empresa: EmpresaControlAdmin) => { setSelected(empresa); setForm(initialForm(empresa)); };
  const close = () => { setSelected(null); setForm(null); };
  const save = async () => {
    if (!selected || !form) return;
    setSaving(true);
    try {
      await configurarControlAdmin(selected.id, form);
      toast(`ActivaQR Control actualizado para ${selected.nombre}.`, 'success');
      setSelected(null); setForm(null); await load();
    } catch (error) { toast(error instanceof Error ? error.message : 'No se pudo guardar.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="relative overflow-hidden border border-line bg-slate-950 p-6 text-white sm:p-8">
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300"><Snowflake size={16} /> Servicio industrial premium</div>
            <h1 className="font-display text-3xl font-black sm:text-4xl">ActivaQR Control</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">Licencias, conectividad y operación en vivo por empresa. El módulo se factura y habilita independientemente del plan base.</p>
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden border border-slate-700 bg-slate-700 text-center">
            {[[activos, 'Tenants activos'], [dispositivos, 'Dispositivos'], [alarmas, 'Alarmas']].map(([value, label]) => <div key={String(label)} className="bg-slate-900 px-4 py-3"><div className="text-xl font-black text-white">{value}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div></div>)}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
        <Search size={18} className="text-faint" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar empresa…" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {loading ? <div className="py-20 text-center text-sm text-muted">Cargando servicio industrial…</div> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((empresa) => {
            const module = empresa.moduloControl;
            const active = module?.estado === 'activo';
            return <article key={empresa.id} className="border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center border ${active ? 'border-cyan-400 bg-cyan-400/10 text-cyan-500' : 'border-line bg-subtle text-faint'}`}><Building2 size={20} /></div><div className="min-w-0"><h2 className="truncate font-display text-lg font-black text-content">{empresa.nombre}</h2><p className="text-xs uppercase tracking-wider text-faint">Plan {empresa.plan} · cuenta {empresa.estado}</p></div></div>
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${active ? 'bg-emerald-500/15 text-emerald-600' : module?.estado === 'suspendido' ? 'bg-danger/10 text-danger' : 'bg-subtle text-muted'}`}>{module?.estado ?? 'No contratado'}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="border border-line p-3"><Cpu size={15} className="mb-2 text-cyan-500" /><strong className="block text-xl text-content">{empresa._count.dispositivosIoT}</strong><span className="text-[10px] uppercase text-faint">de {module?.limiteDispositivos ?? 0}</span></div>
                <div className="border border-line p-3"><RadioTower size={15} className="mb-2 text-cyan-500" /><strong className="block text-xl text-content">{empresa._count.integracionesIoT}</strong><span className="text-[10px] uppercase text-faint">conectores</span></div>
                <div className="border border-line p-3"><Activity size={15} className="mb-2 text-cyan-500" /><strong className="block text-xl text-content">{empresa._count.alarmasIoT}</strong><span className="text-[10px] uppercase text-faint">históricas</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4"><div><p className="text-xs text-faint">Servicio mensual</p><p className="font-mono text-sm font-bold text-content">{module?.abonoMensualUsd != null ? `${module.monedaFacturacion} ${module.abonoMensualUsd}` : 'A definir'}</p></div><button onClick={() => open(empresa)} className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-cyan-700"><SlidersHorizontal size={15} /> Configurar</button></div>
            </article>;
          })}
        </div>
      )}

      {selected && form && <DialogViewport className="z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4" onEscape={close}>
        <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden border border-line bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="control-admin-title">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-950 px-5 py-4 text-white"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Contrato y habilitación</p><h2 id="control-admin-title" className="font-display text-xl font-black">{selected.nombre}</h2></div><ShieldCheck size={24} className="text-cyan-300" /></div>
          <div className="grid flex-1 gap-5 overflow-y-auto p-5 sm:grid-cols-2">
            <label className="text-xs font-black uppercase text-muted sm:col-span-2">Nombre visible del servicio<input value={form.nombreServicio} onChange={(e) => setForm({ ...form, nombreServicio: e.target.value })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" placeholder="ActivaQR Control" /></label>
            <label className="text-xs font-black uppercase text-muted">Estado<select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoModuloControl })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case"><option value="configuracion">En configuración</option><option value="activo">Activo para el tenant</option><option value="suspendido">Suspendido</option></select></label>
            <label className="text-xs font-black uppercase text-muted">Moneda<input value={form.monedaFacturacion} onChange={(e) => setForm({ ...form, monedaFacturacion: e.target.value.toUpperCase() })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Implementación<input type="number" min="0" value={form.cargoImplementacionUsd ?? ''} onChange={(e) => setForm({ ...form, cargoImplementacionUsd: e.target.value ? Number(e.target.value) : null })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Abono mensual<input type="number" min="0" value={form.abonoMensualUsd ?? ''} onChange={(e) => setForm({ ...form, abonoMensualUsd: e.target.value ? Number(e.target.value) : null })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Límite dispositivos<input type="number" min="1" value={form.limiteDispositivos} onChange={(e) => setForm({ ...form, limiteDispositivos: Number(e.target.value) })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Límite gateways<input type="number" min="1" value={form.limiteGateways} onChange={(e) => setForm({ ...form, limiteGateways: Number(e.target.value) })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Retención histórica (días)<input type="number" min="7" value={form.retencionDias} onChange={(e) => setForm({ ...form, retencionDias: Number(e.target.value) })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted">Sin conexión después de (min)<input type="number" min="1" value={form.umbralSinConexionMinutos} onChange={(e) => setForm({ ...form, umbralSinConexionMinutos: Number(e.target.value) })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" /></label>
            <label className="text-xs font-black uppercase text-muted sm:col-span-2">Título del cliente<input value={form.tableroConfig?.titulo ?? ''} onChange={(e) => setForm({ ...form, tableroConfig: { ...form.tableroConfig, titulo: e.target.value } })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" placeholder="Ej: Escuela Nueva Austral" /></label>
            <label className="text-xs font-black uppercase text-muted sm:col-span-2">Subtítulo del tablero<input value={form.tableroConfig?.subtitulo ?? ''} onChange={(e) => setForm({ ...form, tableroConfig: { ...form.tableroConfig, subtitulo: e.target.value } })} className="mt-1 h-11 w-full border border-line bg-surface px-3 text-sm normal-case" placeholder="Ej: Túneles y cámaras · Planta Puerto Madryn" /></label>
            <label className="text-xs font-black uppercase text-muted">Actualizar cada (segundos)<input type="number" readOnly value={5} className="mt-1 h-11 w-full border border-line bg-subtle px-3 text-sm normal-case" /></label>
            <div className="space-y-2 pt-1"><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={form.tableroConfig?.mostrarBateria !== false} onChange={(e) => setForm({ ...form, tableroConfig: { ...form.tableroConfig, mostrarBateria: e.target.checked } })} /> Mostrar batería</label><label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={form.tableroConfig?.mostrarSenal !== false} onChange={(e) => setForm({ ...form, tableroConfig: { ...form.tableroConfig, mostrarSenal: e.target.checked } })} /> Mostrar señal</label></div>
            <label className="flex items-start gap-3 border border-warn bg-warn/10 p-4 sm:col-span-2"><input type="checkbox" checked={form.controlRemotoHabilitado} onChange={(e) => setForm({ ...form, controlRemotoHabilitado: e.target.checked })} className="mt-1" /><span><strong className="block text-sm text-content">Permitir solicitudes de control remoto</strong><span className="text-xs font-normal normal-case text-muted">No ejecuta maniobras por sí solo. Habilita el flujo auditado cuando el dispositivo y su adaptador estén certificados.</span></span></label>
            <label className="text-xs font-black uppercase text-muted sm:col-span-2">Notas comerciales y alcance<textarea rows={4} value={form.notasComerciales ?? ''} onChange={(e) => setForm({ ...form, notasComerciales: e.target.value })} className="mt-1 w-full border border-line bg-surface p-3 text-sm font-normal normal-case" placeholder="Instalación, soporte, SLA, canales incluidos, condiciones…" /></label>
          </div>
          <div className="flex shrink-0 gap-3 border-t border-line bg-surface p-4"><button onClick={close} className="h-11 flex-1 border border-line text-sm font-bold">Cancelar</button><button disabled={saving} onClick={save} className="flex h-11 flex-[2] items-center justify-center gap-2 bg-cyan-700 text-sm font-black uppercase text-white disabled:opacity-50"><Save size={16} />{saving ? 'Guardando…' : 'Guardar servicio'}</button></div>
        </div>
      </DialogViewport>}
    </div>
  );
};
