// v1.0
import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, Check, AlertTriangle, MessageSquare, ShieldCheck, ShieldOff, ChevronDown, ChevronRight } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { useAuth } from '../context/AuthContext';
import { Sector, TipoActivo, Tecnico } from '../data/types';
import { cancelarMiSuscripcion, solicitarUpgrade } from '../data/adminApi';
import {
  PermisoAcceso, MensajeRemoto,
  getSolicitudCliente, revocarAccesoCliente,
  getMensajesCliente, enviarMensajeCliente,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from '../components/ChatRemoto';
import {
  CategoriaEquipo, ParametroCategoria,
  getCategorias, crearCategoria, eliminarCategoria, agregarParametro,
} from '../data/categoriasApi';

type Tab = 'sectores' | 'tipos' | 'tecnicos' | 'categorias';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sectores', label: 'Sectores' },
  { id: 'tipos', label: 'Tipos de Activo' },
  { id: 'tecnicos', label: 'Técnicos' },
  { id: 'categorias', label: 'Categorías' },
];

const inputCls =
  'w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none focus:border-orange-500 bg-white';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-slate-600 mb-1';

export const Configuracion: React.FC = () => {
  const {
    sectores, addSector, updateSector, deleteSector,
    tipos, addTipo, updateTipo, deleteTipo,
    tecnicos, addTecnico, updateTecnico, deleteTecnico,
  } = useActivos();
  const { usuario } = useAuth();

  const [tab, setTab] = useState<Tab>('sectores');

  const mpEstadoSub = usuario?.empresa?.mpEstadoSub ?? null;
  const tieneSubActiva = mpEstadoSub === 'authorized' || mpEstadoSub === 'pending';

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">
          Configuración
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestioná sectores, tipos de activo y técnicos</p>
      </div>

      {/* Plan actual */}
      {usuario && <SeccionPlan />}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 min-h-[44px] font-sketch text-lg font-bold uppercase border-2 transition-all ${
              tab === t.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sectores' && (
        <SectoresSection
          sectores={sectores}
          addSector={addSector}
          updateSector={updateSector}
          deleteSector={deleteSector}
        />
      )}
      {tab === 'tipos' && (
        <TiposSection tipos={tipos} addTipo={addTipo} updateTipo={updateTipo} deleteTipo={deleteTipo} />
      )}
      {tab === 'tecnicos' && (
        <TecnicosSection
          tecnicos={tecnicos}
          addTecnico={addTecnico}
          updateTecnico={updateTecnico}
          deleteTecnico={deleteTecnico}
        />
      )}

      {tab === 'categorias' && <CategoriasSection />}

      {tieneSubActiva && <SeccionSuscripcion />}
      <SeccionAccesoRemoto />
    </div>
  );
};

// ─── Reusable card wrapper ─────────────────────────────────────
const Card: React.FC<{ inactivo?: boolean; children: React.ReactNode }> = ({ inactivo, children }) => (
  <div
    className={`bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 ${
      inactivo ? 'opacity-50' : ''
    }`}
  >
    {children}
  </div>
);

const AddButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-orange-500 text-white px-4 min-h-[44px] font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
  >
    <Plus size={16} />
    {label}
  </button>
);

const IconBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }> = ({
  onClick, title, children, danger,
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center border-2 transition-colors ${
      danger
        ? 'border-slate-300 text-red-600 hover:border-red-600 hover:bg-red-50'
        : 'border-slate-300 text-slate-600 hover:border-slate-800'
    }`}
  >
    {children}
  </button>
);

// ─── SECTORES ──────────────────────────────────────────────────
interface SectoresProps {
  sectores: Sector[];
  addSector: (s: Sector) => void;
  updateSector: (id: string, u: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
}

const SectoresSection: React.FC<SectoresProps> = ({ sectores, addSector, updateSector, deleteSector }) => {
  const [editing, setEditing] = useState<Sector | null>(null);
  const [adding, setAdding] = useState(false);

  const empty: Omit<Sector, 'id'> = { nombre: '', color: '#F97316', activo: true };
  const [form, setForm] = useState<Omit<Sector, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (s: Sector) => { setForm({ nombre: s.nombre, color: s.color, activo: s.activo }); setEditing(s); setAdding(false); };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateSector(editing.id, form);
    else addSector({ ...form, id: `sec-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (s: Sector) => {
    if (window.confirm(`¿Eliminar el sector "${s.nombre}"? Si tiene activos asociados se marcará como inactivo.`)) {
      deleteSector(s.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Sector" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input type="color" value={form.color ?? '#F97316'} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="w-full h-11 border-2 border-slate-300 bg-white" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectores.map((s) => (
          <Card key={s.id} inactivo={!s.activo}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 border-2 border-slate-300 flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-800 truncate">{s.nombre}</span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {s.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(s)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(s)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateSector(s.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── TIPOS ─────────────────────────────────────────────────────
interface TiposProps {
  tipos: TipoActivo[];
  addTipo: (t: TipoActivo) => void;
  updateTipo: (id: string, u: Partial<TipoActivo>) => void;
  deleteTipo: (id: string) => void;
}

const MIDE_FIELDS: { key: keyof Pick<TipoActivo, 'mideTemperatura' | 'mideAmperaje' | 'midePresion' | 'mideVibracion' | 'mideBateria' | 'mideToner' | 'mideContador' | 'mideVoltaje'>; label: string }[] = [
  { key: 'mideTemperatura', label: 'Temperatura' },
  { key: 'mideAmperaje', label: 'Amperaje' },
  { key: 'midePresion', label: 'Presión' },
  { key: 'mideVibracion', label: 'Vibración' },
  { key: 'mideBateria', label: 'Batería' },
  { key: 'mideToner', label: 'Tóner/Consumible' },
  { key: 'mideContador', label: 'Contador (páginas/ciclos)' },
  { key: 'mideVoltaje', label: 'Voltaje' },
];

const TiposSection: React.FC<TiposProps> = ({ tipos, addTipo, updateTipo, deleteTipo }) => {
  const [editing, setEditing] = useState<TipoActivo | null>(null);
  const [adding, setAdding] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {});
  }, []);

  const empty: Omit<TipoActivo, 'id'> = {
    nombre: '', categoriaId: null, mideTemperatura: true, mideAmperaje: false, midePresion: false, mideVibracion: false, mideBateria: false, mideToner: false, mideContador: false, mideVoltaje: false, activo: true,
  };
  const [form, setForm] = useState<Omit<TipoActivo, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (t: TipoActivo) => {
    setForm({ nombre: t.nombre, icono: t.icono, categoriaId: t.categoriaId ?? null, mideTemperatura: t.mideTemperatura, mideAmperaje: t.mideAmperaje, midePresion: t.midePresion, mideVibracion: t.mideVibracion, mideBateria: t.mideBateria ?? false, mideToner: t.mideToner ?? false, mideContador: t.mideContador ?? false, mideVoltaje: t.mideVoltaje ?? false, activo: t.activo });
    setEditing(t); setAdding(false);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateTipo(editing.id, form);
    else addTipo({ ...form, id: `tip-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (t: TipoActivo) => {
    if (window.confirm(`¿Eliminar el tipo "${t.nombre}"? Si tiene activos asociados se marcará como inactivo.`)) {
      deleteTipo(t.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Tipo" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 space-y-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoría de equipo</label>
            <select
              value={form.categoriaId ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value || null }))}
              className={inputCls}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icono ? `${c.icono} ` : ''}{c.nombre}{c.empresaId === null ? ' (Global)' : ''}
                </option>
              ))}
            </select>
            {form.categoriaId && (() => {
              const cat = categorias.find((c) => c.id === form.categoriaId);
              if (!cat || cat.parametros.length === 0) return null;
              return (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <span className="font-bold">Parámetros dinámicos: </span>
                  {cat.parametros.map((p) => `${p.nombre}${p.unidad ? ` (${p.unidad})` : ''}`).join(', ')}
                </div>
              );
            })()}
          </div>
          <div>
            <label className={labelCls}>¿Qué mide? (campos fijos heredados)</label>
            <div className="grid grid-cols-2 gap-2">
              {MIDE_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 border-2 border-slate-300 px-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tipos.map((t) => (
          <Card key={t.id} inactivo={!t.activo}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-slate-800 truncate">{t.nombre}</span>
              <div className="flex gap-1.5 flex-shrink-0">
                {t.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(t)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(t)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateTipo(t.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {MIDE_FIELDS.filter(({ key }) => !!t[key]).map(({ key, label }) => (
                <span key={key} className="text-xs font-semibold bg-slate-100 border border-slate-300 px-2 py-0.5 text-slate-600 flex items-center gap-1">
                  <Check size={11} /> {label}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── TECNICOS ──────────────────────────────────────────────────
interface TecnicosProps {
  tecnicos: Tecnico[];
  addTecnico: (t: Tecnico) => void;
  updateTecnico: (id: string, u: Partial<Tecnico>) => void;
  deleteTecnico: (id: string) => void;
}

const TecnicosSection: React.FC<TecnicosProps> = ({ tecnicos, addTecnico, updateTecnico, deleteTecnico }) => {
  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [adding, setAdding] = useState(false);

  const empty: Omit<Tecnico, 'id'> = { nombre: '', rol: 'tecnico', email: '', telefono: '', activo: true };
  const [form, setForm] = useState<Omit<Tecnico, 'id'>>(empty);

  const startAdd = () => { setForm(empty); setAdding(true); setEditing(null); };
  const startEdit = (t: Tecnico) => {
    setForm({ nombre: t.nombre, rol: t.rol, email: t.email ?? '', telefono: t.telefono ?? '', activo: t.activo });
    setEditing(t); setAdding(false);
  };
  const cancel = () => { setAdding(false); setEditing(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateTecnico(editing.id, form);
    else addTecnico({ ...form, id: `tec-${Date.now()}` });
    cancel();
  };

  const confirmDelete = (t: Tecnico) => {
    if (window.confirm(`¿Eliminar al técnico "${t.nombre}"? Si tiene registros asociados se marcará como inactivo.`)) {
      deleteTecnico(t.id);
    }
  };

  return (
    <div className="space-y-4">
      {!adding && !editing && <AddButton onClick={startAdd} label="Agregar Técnico" />}

      {(adding || editing) && (
        <form onSubmit={submit} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value as Tecnico['rol'] }))} className={inputCls}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tecnicos.map((t) => (
          <Card key={t.id} inactivo={!t.activo}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{t.nombre}</div>
                <div className="text-xs font-semibold uppercase text-orange-500 tracking-wider">{t.rol}</div>
                {t.email && <div className="text-xs text-slate-500 truncate mt-1">{t.email}</div>}
                {t.telefono && <div className="text-xs text-slate-500 truncate">{t.telefono}</div>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {t.activo ? (
                  <>
                    <IconBtn onClick={() => startEdit(t)} title="Editar"><Pencil size={15} /></IconBtn>
                    <IconBtn onClick={() => confirmDelete(t)} title="Eliminar" danger><Trash2 size={15} /></IconBtn>
                  </>
                ) : (
                  <IconBtn onClick={() => updateTecnico(t.id, { activo: true })} title="Reactivar"><RotateCcw size={15} /></IconBtn>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── CATEGORÍAS ────────────────────────────────────────────────

const CategoriasSection: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [formNueva, setFormNueva] = useState({ nombre: '', icono: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setCargando(true);
    getCategorias()
      .then(setCategorias)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const toggleExpand = (id: string) =>
    setExpandido((p) => ({ ...p, [id]: !p[id] }));

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const nueva = await crearCategoria({
        nombre: formNueva.nombre,
        icono: formNueva.icono || undefined,
        descripcion: formNueva.descripcion || undefined,
      });
      setCategorias((p) => [...p, nueva]);
      setAdding(false);
      setFormNueva({ nombre: '', icono: '', descripcion: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear categoría');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
      await eliminarCategoria(id);
      setCategorias((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (cargando) return <p className="text-slate-500 text-sm">Cargando categorías...</p>;

  const globales = categorias.filter((c) => c.empresaId === null);
  const propias = categorias.filter((c) => c.empresaId !== null);

  return (
    <div className="space-y-6">
      {error && (
        <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      {/* Categorías globales */}
      <div>
        <h3 className="font-sketch font-black text-lg uppercase tracking-tight text-slate-700 mb-3">
          Categorías globales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {globales.map((cat) => (
            <CategoriaCard
              key={cat.id}
              cat={cat}
              expandido={!!expandido[cat.id]}
              onToggle={() => toggleExpand(cat.id)}
              isGlobal
            />
          ))}
        </div>
      </div>

      {/* Categorías propias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sketch font-black text-lg uppercase tracking-tight text-slate-700">
            Mis categorías
          </h3>
          {!adding && (
            <AddButton onClick={() => setAdding(true)} label="Nueva categoría" />
          )}
        </div>

        {adding && (
          <form onSubmit={handleCrear} className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 space-y-3 mb-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={formNueva.nombre} onChange={(e) => setFormNueva((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} placeholder="Ej: Turbina de vapor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ícono (emoji)</label>
                <input value={formNueva.icono} onChange={(e) => setFormNueva((p) => ({ ...p, icono: e.target.value }))} className={inputCls} placeholder="icono" />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <input value={formNueva.descripcion} onChange={(e) => setFormNueva((p) => ({ ...p, descripcion: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAdding(false)} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">Cancelar</button>
              <button type="submit" disabled={guardando} className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        )}

        {propias.length === 0 && !adding && (
          <p className="text-slate-400 text-sm italic">Aún no tenés categorías propias. Las globales están disponibles para todos.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {propias.map((cat) => (
            <CategoriaCard
              key={cat.id}
              cat={cat}
              expandido={!!expandido[cat.id]}
              onToggle={() => toggleExpand(cat.id)}
              onEliminar={() => handleEliminar(cat.id, cat.nombre)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface CategoriaCardProps {
  cat: CategoriaEquipo;
  expandido: boolean;
  onToggle: () => void;
  isGlobal?: boolean;
  onEliminar?: () => void;
}

const CategoriaCard: React.FC<CategoriaCardProps> = ({ cat, expandido, onToggle, isGlobal, onEliminar }) => (
  <div className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]">
    <div
      className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 min-w-0">
        {cat.icono && <span className="text-lg flex-shrink-0">{cat.icono}</span>}
        <span className="font-bold text-slate-800 truncate">{cat.nombre}</span>
        {isGlobal && (
          <span className="ml-1 text-xs font-black uppercase tracking-wider bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-slate-500 flex-shrink-0">
            Global
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-400">{cat.parametros.length} params</span>
        {!isGlobal && onEliminar && (
          <button
            onClick={(e) => { e.stopPropagation(); onEliminar(); }}
            className="p-1 border-2 border-slate-300 text-red-600 hover:border-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        )}
        {expandido ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </div>
    </div>
    {expandido && (
      <div className="border-t-2 border-slate-200 p-3 space-y-1">
        {cat.parametros.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Sin parámetros definidos.</p>
        ) : (
          cat.parametros.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 py-0.5 border-b border-slate-100 last:border-0">
              <span className="font-semibold">{p.nombre}</span>
              <div className="flex items-center gap-2 text-slate-400">
                {p.unidad && <span className="font-mono">{p.unidad}</span>}
                {p.umbralAlerta != null && <span className="text-amber-600">alerta:{p.umbralAlerta}</span>}
                {p.umbralCritico != null && <span className="text-red-500">critico:{p.umbralCritico}</span>}
                {p.invertido && <span title="Valor bajo es peor">↓</span>}
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
);

const PLAN_INFO: { plan: string; label: string; activos: string; tecnicos: string; qr: string; acceso: string }[] = [
  { plan: 'inicial',    label: 'Inicial',    activos: '10',         tecnicos: '2',         qr: 'Suspendida', acceso: '—' },
  { plan: 'empresa',    label: 'Empresa',    activos: '50',         tecnicos: '5',         qr: 'Siempre',    acceso: 'Soporte remoto' },
  { plan: 'industrial', label: 'Industrial', activos: 'Ilimitado',  tecnicos: 'Ilimitado', qr: 'Siempre',    acceso: 'Soporte remoto' },
];

const SeccionPlan: React.FC = () => {
  const { usuario } = useAuth();
  const empresaExt = usuario?.empresa as { plan?: string; planSolicitado?: string | null } | null;
  const plan = empresaExt?.plan ?? 'inicial';
  const planSolicitadoActual = empresaExt?.planSolicitado ?? null;

  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planesUpgrade = PLAN_INFO.filter((p) => {
    const orden: Record<string, number> = { inicial: 0, empresa: 1, industrial: 2 };
    return (orden[p.plan] ?? 0) > (orden[plan] ?? 0);
  });

  const handleSolicitarUpgrade = async (planDestino: string) => {
    setCargando(true);
    setError(null);
    setExito(false);
    try {
      await solicitarUpgrade(planDestino);
      setExito(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mb-8 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-sketch font-black text-xl uppercase tracking-tight text-slate-800">Plan actual</h2>
          <span className="inline-block mt-1 px-3 py-1 bg-orange-500 text-white text-xs font-black uppercase tracking-wider border-2 border-slate-800">
            {plan.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm border-2 border-slate-200">
          <thead>
            <tr className="bg-slate-900 text-white">
              {['Plan', 'Activos', 'Tecnicos', 'Ficha QR', 'Acceso remoto'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_INFO.map((p, i) => (
              <tr key={p.plan} className={`border-b border-slate-100 ${p.plan === plan ? 'bg-orange-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-3 py-2 font-sketch font-bold">
                  {p.label}
                  {p.plan === plan && <span className="ml-2 text-orange-500 text-xs font-sans">actual</span>}
                </td>
                <td className="px-3 py-2">{p.activos}</td>
                <td className="px-3 py-2">{p.tecnicos}</td>
                <td className="px-3 py-2">{p.qr}</td>
                <td className="px-3 py-2">{p.acceso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solicitud pendiente */}
      {planSolicitadoActual && !exito && (
        <div className="border-t-2 border-slate-100 pt-4">
          <div className="bg-amber-50 border-2 border-amber-400 px-4 py-3">
            <p className="font-black text-amber-700 text-sm uppercase tracking-wide">Solicitud pendiente</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Plan {PLAN_INFO.find((p) => p.plan === planSolicitadoActual)?.label ?? planSolicitadoActual.toUpperCase()} — en proceso. El equipo de ActivaQR la gestionara a la brevedad.
            </p>
          </div>
        </div>
      )}

      {/* Botones de upgrade */}
      {planesUpgrade.length > 0 && !planSolicitadoActual && !exito && (
        <div className="border-t-2 border-slate-100 pt-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Mejorar plan a:</p>
          <div className="flex flex-wrap gap-2">
            {planesUpgrade.map((p) => (
              <button
                key={p.plan}
                onClick={() => handleSolicitarUpgrade(p.plan)}
                disabled={cargando}
                className="px-5 py-2.5 bg-orange-500 text-white border-2 border-slate-900 font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? 'Enviando...' : `Mejorar plan a ${p.label}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmación */}
      {exito && (
        <div className="border-t-2 border-slate-100 pt-4">
          <div className="bg-emerald-50 border-2 border-emerald-400 px-4 py-3">
            <p className="font-black text-emerald-700 text-sm uppercase tracking-wide">Solicitud enviada</p>
            <p className="text-sm text-emerald-600 mt-0.5">El equipo de ActivaQR la procesara en breve.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t-2 border-slate-100 pt-4">
          <div className="bg-red-50 border-2 border-red-400 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const SeccionSuscripcion: React.FC = () => {
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelar = async () => {
    setCargando(true);
    setError(null);
    try {
      await cancelarMiSuscripcion();
      setCancelada(true);
      setConfirmando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar la suscripción.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mt-10 border-t-2 border-slate-200 pt-8">
      <h2 className="font-sketch font-black text-xl uppercase tracking-tight text-slate-800 mb-1">
        Suscripción
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Gestioná tu suscripción activa a ActivaQR.
      </p>

      {cancelada ? (
        <div className="border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tu suscripción fue cancelada. Los débitos automáticos se detendrán en el próximo ciclo.
        </div>
      ) : (
        <>
          {error && (
            <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 mb-3">
              {error}
            </div>
          )}

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 text-sm font-bold hover:border-red-600 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={16} />
              Cancelar mi suscripción
            </button>
          ) : (
            <div className="border-2 border-red-400 bg-red-50 p-4 space-y-3 max-w-md">
              <p className="text-sm font-black text-red-700 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle size={16} /> Confirmá la cancelación
              </p>
              <p className="text-sm text-red-600">
                Esto dará de baja tu suscripción en Mercado Pago. Los débitos automáticos se detendrán. ¿Estás seguro?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelar}
                  disabled={cargando}
                  className="px-4 py-2 bg-red-600 text-white border-2 border-red-800 font-bold text-sm disabled:opacity-50"
                >
                  {cargando ? 'Cancelando...' : 'Sí, cancelar suscripción'}
                </button>
                <button
                  onClick={() => { setConfirmando(false); setError(null); }}
                  className="px-4 py-2 border-2 border-slate-400 font-bold text-sm text-slate-600"
                >
                  No, volver
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SeccionAccesoRemoto: React.FC = () => {
  const { usuario } = useAuth();
  const plan = usuario?.empresa?.plan ?? 'inicial';
  const [permiso, setPermiso] = useState<PermisoAcceso | null>(null);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [mostrarChat, setMostrarChat] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [revocar, setRevocar] = useState(false);

  const planesConAcceso = ['empresa', 'industrial'];
  if (!planesConAcceso.includes(plan)) return null;

  useEffect(() => {
    getSolicitudCliente()
      .then(setPermiso)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!mostrarChat || permiso?.estado !== 'activo') return;
    getMensajesCliente().then(setMensajes).catch(() => {});
    const iv = setInterval(() => {
      getMensajesCliente().then(setMensajes).catch(() => {});
    }, 8000);
    return () => clearInterval(iv);
  }, [mostrarChat, permiso?.estado]);

  const handleRevocar = async () => {
    await revocarAccesoCliente();
    setPermiso((p) => p ? { ...p, estado: 'revocado' } : p);
    setRevocar(false);
  };

  if (cargando) return null;
  if (!permiso || permiso.estado === 'revocado') return null;

  return (
    <div className="mt-10 border-t-2 border-slate-200 pt-8">
      <h2 className="font-sketch font-black text-xl uppercase tracking-tight text-slate-800 mb-1 flex items-center gap-2">
        <ShieldCheck size={20} className="text-orange-500" /> Acceso remoto de soporte
      </h2>

      {permiso.estado === 'pendiente' && (
        <div className="border-2 border-amber-400 bg-amber-50 p-4 max-w-md space-y-3">
          <p className="text-sm font-black text-amber-700 uppercase tracking-wide">Solicitud pendiente</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            El equipo de ActivaQR solicitó acceso remoto a tus activos para brindarte soporte.
            {permiso.costoMensual ? ` Costo adicional: $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
          </p>
          <p className="text-xs text-amber-600">Si recibiste el link por email, hacé click en "Aprobar acceso" en ese email.</p>
        </div>
      )}

      {permiso.estado === 'activo' && (
        <div className="space-y-4 max-w-lg">
          <div className="border-2 border-emerald-400 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} /> Acceso activo
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                El soporte de ActivaQR puede ver tus activos y mediciones.
                {permiso.costoMensual ? ` $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
              </p>
            </div>
            {!revocar ? (
              <button
                onClick={() => setRevocar(true)}
                className="flex items-center gap-1 text-xs font-bold text-red-600 border-2 border-red-300 px-3 py-2 hover:border-red-600 transition-colors whitespace-nowrap"
              >
                <ShieldOff size={13} /> Revocar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleRevocar} className="text-xs font-bold bg-red-600 text-white border-2 border-red-800 px-3 py-2">Confirmar</button>
                <button onClick={() => setRevocar(false)} className="text-xs font-bold border-2 border-slate-300 px-3 py-2">No</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMostrarChat((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold border-2 border-slate-900 px-4 py-2 hover:bg-slate-50 transition-colors"
          >
            <MessageSquare size={16} />
            {mostrarChat ? 'Ocultar chat' : 'Abrir chat con soporte'}
          </button>

          {mostrarChat && (
            <ChatRemoto
              mensajes={mensajes}
              miRol="cliente"
              onEnviar={async (c) => {
                const m = await enviarMensajeCliente(c);
                setMensajes((prev) => [...prev, m]);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
