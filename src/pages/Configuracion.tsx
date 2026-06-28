// v1.1.0
import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, Check, AlertTriangle, MessageSquare, ShieldCheck, ShieldOff, ChevronDown, ChevronRight, KeyRound, UserX } from 'lucide-react';
import { Operador, getOperadores, crearOperador, actualizarOperador, desactivarOperador, resetPasswordOperador } from '../data/operadoresApi';
import { useActivos } from '../hooks/useActivos';
import { useAuth } from '../context/AuthContext';
import { Sector, TipoActivo } from '../data/types';
import { cancelarMiSuscripcion, solicitarUpgrade } from '../data/adminApi';
import {
  PermisoAcceso, MensajeRemoto,
  getSolicitudCliente, revocarAccesoCliente,
  getMensajesCliente, enviarMensajeCliente,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from '../components/ChatRemoto';
import { NotificacionesPush } from '../components/NotificacionesPush';
import { apiFetch } from '../data/auth';
import {
  CategoriaEquipo, ParametroCategoria,
  getCategorias, crearCategoria, eliminarCategoria, agregarParametro,
} from '../data/categoriasApi';

type Tab = 'sectores' | 'tipos' | 'categorias' | 'personal';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sectores', label: 'Sectores' },
  { id: 'tipos', label: 'Tipos de Activo' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'personal', label: 'Personal' },
];

const inputCls =
  'w-full border border-line px-3 h-11 text-sm outline-none focus:border-brand-600 bg-surface';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-muted mb-1';

export const Configuracion: React.FC = () => {
  const {
    sectores, addSector, updateSector, deleteSector,
    tipos, addTipo, updateTipo, deleteTipo,
  } = useActivos();
  const { usuario } = useAuth();

  const [tab, setTab] = useState<Tab>('sectores');

  const mpEstadoSub = usuario?.empresa?.mpEstadoSub ?? null;
  const tieneSubActiva = mpEstadoSub === 'authorized' || mpEstadoSub === 'pending';

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-content uppercase tracking-tight">
          Configuración
        </h1>
        <p className="text-muted text-sm mt-1">Gestioná sectores, tipos de activo y personal</p>
      </div>

      <NotificacionesPush />

      <SeccionTelegram />

      {/* Plan actual */}
      {usuario && <SeccionPlan />}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 min-h-[44px] font-display text-lg font-bold uppercase border transition-all ${
              tab === t.id
                ? 'bg-slate-900 text-white border-line shadow-soft'
                : 'bg-surface text-muted border-line hover:border-content'
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
      {tab === 'categorias' && <CategoriasSection />}
      {tab === 'personal' && <PersonalSection />}

      {tieneSubActiva && <SeccionSuscripcion />}
      <SeccionAccesoRemoto />
    </div>
  );
};

// ─── Reusable card wrapper ─────────────────────────────────────
const Card: React.FC<{ inactivo?: boolean; children: React.ReactNode }> = ({ inactivo, children }) => (
  <div
    className={`bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 ${
      inactivo ? 'opacity-50' : ''
    }`}
  >
    {children}
  </div>
);

const AddButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-brand-600 text-white px-4 min-h-[44px] font-bold border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
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
    className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center border transition-colors ${
      danger
        ? 'border-line text-danger hover:border-danger hover:bg-danger/10'
        : 'border-line text-muted hover:border-content'
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
        <form onSubmit={submit} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input type="color" value={form.color ?? '#F97316'} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="w-full h-11 border border-line bg-surface" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border border-line-strong font-bold text-muted">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectores.map((s) => (
          <Card key={s.id} inactivo={!s.activo}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 border border-line flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-content truncate">{s.nombre}</span>
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
        <form onSubmit={submit} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 space-y-4">
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
                <div className="mt-2 p-2 bg-subtle border border-line text-xs text-muted">
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
                <label key={key} className="flex items-center gap-2 border border-line px-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-content">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {(() => {
            const algunFlag = MIDE_FIELDS.some(({ key }) => !!form[key]);
            const tieneCategoria = !!form.categoriaId;
            if (algunFlag || tieneCategoria) return null;
            return (
              <div className="border border-warn bg-warn/10 p-3 text-sm">
                <p className="font-bold text-warn-strong dark:text-warn mb-1">Este tipo no medira ningun parametro.</p>
                <p className="text-warn-strong dark:text-warn text-xs leading-snug">
                  Si tu rubro encaja en los fijos (temperatura, amperaje, etc.), tildalos arriba.
                  Si tu rubro tiene parametros propios (ej. piscina: pH, cloro, salinidad;
                  panaderia: presion de vapor; alquiler: km recorridos), ir a la pestaña
                  <strong> Categorias</strong>, crear una nueva con tus parametros y
                  asignarsela en el selector de arriba.
                </p>
              </div>
            );
          })()}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={cancel} className="px-4 min-h-[44px] border border-line-strong font-bold text-muted">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft">{editing ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tipos.map((t) => (
          <Card key={t.id} inactivo={!t.activo}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-content truncate">{t.nombre}</span>
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
                <span key={key} className="text-xs font-semibold bg-subtle border border-line px-2 py-0.5 text-muted flex items-center gap-1">
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


// ─── CATEGORÍAS ────────────────────────────────────────────────

const CategoriasSection: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [formNueva, setFormNueva] = useState({ nombre: '', descripcion: '' });
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
        descripcion: formNueva.descripcion || undefined,
      });
      setCategorias((p) => [...p, nueva]);
      setExpandido((p) => ({ ...p, [nueva.id]: true }));
      setAdding(false);
      setFormNueva({ nombre: '', descripcion: '' });
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

  const handleParametroAgregado = (categoriaId: string, nuevo: ParametroCategoria) => {
    setCategorias((prev) =>
      prev.map((c) =>
        c.id === categoriaId ? { ...c, parametros: [...c.parametros, nuevo] } : c
      )
    );
  };

  if (cargando) return <p className="text-muted text-sm">Cargando categorías...</p>;

  const globales = categorias.filter((c) => c.empresaId === null);
  const propias = categorias.filter((c) => c.empresaId !== null);

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger">{error}</div>
      )}

      {/* Cómo funciona */}
      <div className="border border-line bg-slate-900 text-white p-4 shadow-soft">
        <h3 className="font-display font-black text-lg uppercase tracking-tight mb-2 text-brand-400">Cómo funcionan las categorías</h3>
        <p className="text-sm text-slate-200 leading-relaxed mb-3">
          Una categoría define <strong>qué se mide</strong> en cada tipo de equipo. Por ejemplo "Motor Diesel" mide
          temperatura de agua, presión de aceite y RPM; "Estética" mide potencia, disparos y temperatura del cabezal.
          Cada parámetro tiene sus umbrales — cuando una medición los supera, el sistema dispara la alerta automática.
        </p>
        <ol className="text-sm text-slate-200 space-y-1.5 list-none">
          <li className="flex gap-2"><span className="font-black text-brand-400 flex-shrink-0">1.</span> Elegí una categoría <strong>global</strong> lista para usar, o creá la tuya con "Nueva categoría".</li>
          <li className="flex gap-2"><span className="font-black text-brand-400 flex-shrink-0">2.</span> Si es propia, agregale parámetros con sus unidades y umbrales (alerta / crítico / urgente).</li>
          <li className="flex gap-2"><span className="font-black text-brand-400 flex-shrink-0">3.</span> En <strong>Tipos de Activo</strong> asignás la categoría al tipo de equipo.</li>
          <li className="flex gap-2"><span className="font-black text-brand-400 flex-shrink-0">4.</span> Al medir ese activo, el formulario muestra esos parámetros y calcula el estado solo.</li>
        </ol>
      </div>

      {/* Categorías globales */}
      <div>
        <h3 className="font-display font-black text-lg uppercase tracking-tight text-content mb-1">
          Categorías globales
        </h3>
        <p className="text-xs text-muted mb-3">Listas para usar. Cubren rubros desde estética hasta aeroespacial. Tocá una para ver sus parámetros.</p>
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
          <h3 className="font-display font-black text-lg uppercase tracking-tight text-content">
            Mis categorías
          </h3>
          {!adding && (
            <AddButton onClick={() => setAdding(true)} label="Nueva categoría" />
          )}
        </div>

        {adding && (
          <form onSubmit={handleCrear} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 space-y-3 mb-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input required value={formNueva.nombre} onChange={(e) => setFormNueva((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} placeholder="Ej: Turbina de vapor" />
            </div>
            <div>
              <label className={labelCls}>Descripción</label>
              <input value={formNueva.descripcion} onChange={(e) => setFormNueva((p) => ({ ...p, descripcion: e.target.value }))} className={inputCls} placeholder="Para qué tipo de equipo es" />
            </div>
            <p className="text-xs text-muted">Después de crearla, abrila para agregarle parámetros.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAdding(false)} className="px-4 min-h-[44px] border border-line-strong font-bold text-muted">Cancelar</button>
              <button type="submit" disabled={guardando} className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        )}

        {propias.length === 0 && !adding && (
          <p className="text-faint text-sm italic">Aún no tenés categorías propias. Las globales están disponibles para todos.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {propias.map((cat) => (
            <CategoriaCard
              key={cat.id}
              cat={cat}
              expandido={!!expandido[cat.id]}
              onToggle={() => toggleExpand(cat.id)}
              onEliminar={() => handleEliminar(cat.id, cat.nombre)}
              onParametroAgregado={(p) => handleParametroAgregado(cat.id, p)}
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
  onParametroAgregado?: (p: ParametroCategoria) => void;
}

const TIPOS_PARAM: { value: ParametroCategoria['tipo']; label: string }[] = [
  { value: 'numerico', label: 'Numérico' },
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'booleano', label: 'Sí / No' },
  { value: 'texto', label: 'Texto' },
  { value: 'seleccion', label: 'Selección' },
];

const slugificar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const CategoriaCard: React.FC<CategoriaCardProps> = ({ cat, expandido, onToggle, isGlobal, onEliminar, onParametroAgregado }) => {
  const empty = { nombre: '', unidad: '', tipo: 'numerico' as ParametroCategoria['tipo'], umbralAlerta: '', umbralCritico: '', umbralUrgente: '', invertido: false };
  const [paramForm, setParamForm] = useState(empty);
  const [agregando, setAgregando] = useState(false);
  const [guardandoParam, setGuardandoParam] = useState(false);
  const [errorParam, setErrorParam] = useState<string | null>(null);

  const esNumerico = paramForm.tipo === 'numerico' || paramForm.tipo === 'porcentaje';

  const handleAgregarParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramForm.nombre.trim()) return;
    setGuardandoParam(true);
    setErrorParam(null);
    try {
      const nuevo = await agregarParametro(cat.id, {
        nombre: paramForm.nombre.trim(),
        clave: slugificar(paramForm.nombre) || `param_${Date.now()}`,
        unidad: paramForm.unidad || undefined,
        tipo: paramForm.tipo,
        orden: cat.parametros.length + 1,
        umbralAlerta: esNumerico && paramForm.umbralAlerta !== '' ? Number(paramForm.umbralAlerta) : undefined,
        umbralCritico: esNumerico && paramForm.umbralCritico !== '' ? Number(paramForm.umbralCritico) : undefined,
        umbralUrgente: esNumerico && paramForm.umbralUrgente !== '' ? Number(paramForm.umbralUrgente) : undefined,
        invertido: esNumerico ? paramForm.invertido : false,
      });
      onParametroAgregado?.(nuevo);
      setParamForm(empty);
      setAgregando(false);
    } catch (e) {
      setErrorParam(e instanceof Error ? e.message : 'Error al agregar parámetro');
    } finally {
      setGuardandoParam(false);
    }
  };

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft">
      <div
        className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-subtle transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-content truncate">{cat.nombre}</span>
          {isGlobal && (
            <span className="ml-1 text-xs font-black uppercase tracking-wider bg-subtle border border-line px-1.5 py-0.5 text-muted flex-shrink-0">
              Global
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-faint">{cat.parametros.length} params</span>
          {!isGlobal && onEliminar && (
            <button
              onClick={(e) => { e.stopPropagation(); onEliminar(); }}
              className="p-1 border border-line text-danger hover:border-danger hover:bg-danger/10 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          )}
          {expandido ? <ChevronDown size={16} className="text-faint" /> : <ChevronRight size={16} className="text-faint" />}
        </div>
      </div>
      {expandido && (
        <div className="border border-line p-3 space-y-1">
          {cat.descripcion && <p className="text-xs text-muted italic mb-2">{cat.descripcion}</p>}
          {cat.parametros.length === 0 ? (
            <p className="text-xs text-faint italic">Sin parámetros definidos.</p>
          ) : (
            cat.parametros.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs text-muted py-0.5 border-b border-line last:border-0">
                <span className="font-semibold min-w-0 truncate">{p.nombre}</span>
                <div className="flex items-center gap-2 text-faint flex-shrink-0 flex-wrap justify-end">
                  {p.unidad && <span className="font-mono">{p.unidad}</span>}
                  {p.umbralAlerta != null && <span className="text-warn-strong dark:text-warn">alerta:{p.umbralAlerta}</span>}
                  {p.umbralCritico != null && <span className="text-danger">critico:{p.umbralCritico}</span>}
                  {p.invertido && <span title="Valor bajo es peor">baja</span>}
                </div>
              </div>
            ))
          )}

          {/* Agregar parámetro (solo categorías propias) */}
          {!isGlobal && onParametroAgregado && (
            <div className="pt-2">
              {!agregando ? (
                <button
                  onClick={() => setAgregando(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-brand-600 border border-brand-200 px-2.5 py-1.5 hover:border-brand-600 transition-colors"
                >
                  <Plus size={13} /> Agregar parámetro
                </button>
              ) : (
                <form onSubmit={handleAgregarParam} className="border border-line bg-subtle p-3 space-y-2 mt-1">
                  {errorParam && <p className="text-xs text-danger font-semibold">{errorParam}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-black uppercase tracking-wider text-muted">Nombre del parámetro *</label>
                      <input
                        autoFocus required value={paramForm.nombre}
                        onChange={(e) => setParamForm((p) => ({ ...p, nombre: e.target.value }))}
                        className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-brand-600 bg-surface"
                        placeholder="Ej: Temperatura de cabezal"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-muted">Unidad</label>
                      <input
                        value={paramForm.unidad}
                        onChange={(e) => setParamForm((p) => ({ ...p, unidad: e.target.value }))}
                        className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-brand-600 bg-surface"
                        placeholder="°C, bar, %"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-muted">Tipo</label>
                      <select
                        value={paramForm.tipo}
                        onChange={(e) => setParamForm((p) => ({ ...p, tipo: e.target.value as ParametroCategoria['tipo'] }))}
                        className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-brand-600 bg-surface"
                      >
                        {TIPOS_PARAM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {esNumerico && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-warn-strong dark:text-warn">Alerta</label>
                          <input type="number" step="any" value={paramForm.umbralAlerta}
                            onChange={(e) => setParamForm((p) => ({ ...p, umbralAlerta: e.target.value }))}
                            className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-warn bg-surface" />
                        </div>
                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-danger">Crítico</label>
                          <input type="number" step="any" value={paramForm.umbralCritico}
                            onChange={(e) => setParamForm((p) => ({ ...p, umbralCritico: e.target.value }))}
                            className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-danger bg-surface" />
                        </div>
                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-danger-strong dark:text-danger">Urgente</label>
                          <input type="number" step="any" value={paramForm.umbralUrgente}
                            onChange={(e) => setParamForm((p) => ({ ...p, umbralUrgente: e.target.value }))}
                            className="w-full border border-line px-2 h-9 text-sm outline-none focus:border-danger bg-surface" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                        <input type="checkbox" checked={paramForm.invertido}
                          onChange={(e) => setParamForm((p) => ({ ...p, invertido: e.target.checked }))} />
                        El valor es peligroso cuando <strong>baja</strong> (ej: presión de aceite, batería, nivel)
                      </label>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setAgregando(false); setParamForm(empty); setErrorParam(null); }}
                      className="px-3 h-9 border border-line text-xs font-bold text-muted">Cancelar</button>
                    <button type="submit" disabled={guardandoParam}
                      className="px-3 h-9 bg-slate-900 text-white text-xs font-black uppercase border border-line disabled:opacity-50">
                      {guardandoParam ? 'Guardando...' : 'Agregar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── PERSONAL ─────────────────────────────────────────────────

const PersonalSection: React.FC = () => {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', cargo: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', cargo: '' });

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetando, setResetando] = useState(false);

  const cargar = () => {
    setCargando(true);
    getOperadores()
      .then(setOperadores)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await crearOperador({ ...form, cargo: form.cargo || undefined });
      setOperadores((p) => [...p, nuevo]);
      setForm({ nombre: '', email: '', password: '', cargo: '' });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear operador');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setError(null);
    try {
      const actualizado = await actualizarOperador(editId, { nombre: editForm.nombre, cargo: editForm.cargo || null });
      setOperadores((p) => p.map((o) => o.id === editId ? { ...o, ...actualizado } : o));
      setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleDesactivar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Desactivar al operador "${nombre}"?`)) return;
    setError(null);
    try {
      await desactivarOperador(id);
      setOperadores((p) => p.map((o) => o.id === id ? { ...o, activo: false } : o));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetId) return;
    setResetando(true);
    setError(null);
    try {
      await resetPasswordOperador(resetId, resetPwd);
      setResetId(null);
      setResetPwd('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resetear contraseña');
    } finally {
      setResetando(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger">{error}</div>
      )}

      <p className="text-sm text-muted">
        El personal puede iniciar sesion con email y contrasena para registrar mediciones. Asignales un cargo libre como "Tecnico", "Supervisor" u "Operador de campo".
      </p>

      {!adding && (
        <AddButton onClick={() => setAdding(true)} label="Nuevo personal" />
      )}

      {adding && (
        <form onSubmit={handleCrear} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              className={inputCls}
              placeholder="Juan Perez"
            />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input
              value={form.cargo}
              onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))}
              className={inputCls}
              placeholder="Ej: Tecnico, Supervisor, Operador de campo..."
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={inputCls}
              placeholder="operador@empresa.com"
            />
          </div>
          <div>
            <label className={labelCls}>Contrasena (min. 8 caracteres)</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setAdding(false); setForm({ nombre: '', email: '', password: '', cargo: '' }); }}
              className="px-4 min-h-[44px] border border-line-strong font-bold text-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft disabled:opacity-50"
            >
              {guardando ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {editId && (
        <form onSubmit={handleEditar} className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre</label>
            <input required value={editForm.nombre} onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input value={editForm.cargo} onChange={(e) => setEditForm((p) => ({ ...p, cargo: e.target.value }))} className={inputCls} placeholder="Ej: Tecnico, Supervisor..." />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setEditId(null)} className="px-4 min-h-[44px] border border-line-strong font-bold text-muted">Cancelar</button>
            <button type="submit" className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft">Guardar</button>
          </div>
        </form>
      )}

      {/* Reset password inline form */}
      {resetId && (
        <form onSubmit={handleReset} className="bg-warn/10 border border-warn p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className={labelCls}>Nueva contrasena para {operadores.find((o) => o.id === resetId)?.nombre}</label>
            <input
              required
              type="password"
              minLength={8}
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              type="button"
              onClick={() => { setResetId(null); setResetPwd(''); }}
              className="px-4 min-h-[44px] border border-line-strong font-bold text-muted text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resetando}
              className="px-4 min-h-[44px] bg-slate-900 text-white border border-line font-bold text-sm disabled:opacity-50"
            >
              {resetando ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-faint">Cargando personal...</p>
      ) : operadores.length === 0 ? (
        <p className="text-sm text-faint italic">No hay personal registrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {operadores.map((o) => (
            <Card key={o.id} inactivo={!o.activo}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-content truncate">{o.nombre}</div>
                  {o.cargo && (
                    <div className="text-xs font-semibold uppercase text-brand-600 tracking-wider">{o.cargo}</div>
                  )}
                  <div className="text-xs text-muted truncate mt-1">{o.email}</div>
                  {!o.activo && (
                    <span className="mt-1 inline-block text-xs font-black uppercase bg-danger/10 border border-danger text-danger px-1.5 py-0.5">
                      Inactivo
                    </span>
                  )}
                </div>
                {o.activo && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <IconBtn
                      onClick={() => { setEditId(o.id); setEditForm({ nombre: o.nombre, cargo: o.cargo ?? '' }); }}
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </IconBtn>
                    <IconBtn
                      onClick={() => { setResetId(o.id); setResetPwd(''); }}
                      title="Resetear contrasena"
                    >
                      <KeyRound size={15} />
                    </IconBtn>
                    <IconBtn
                      onClick={() => handleDesactivar(o.id, o.nombre)}
                      title="Desactivar"
                      danger
                    >
                      <UserX size={15} />
                    </IconBtn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const SeccionTelegram: React.FC = () => {
  const [chatId, setChatId] = React.useState('');
  const [guardado, setGuardado] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    apiFetch('auth/perfil').then((d: any) => { if (d.telegramChatId) setChatId(d.telegramChatId); }).catch(() => {});
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await apiFetch('auth/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegramChatId: chatId.trim() || null }) });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setCargando(false);
    }
  };

  const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'activaqr_bot';

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5 mb-6">
      <h2 className="text-sm font-black uppercase tracking-wider text-content mb-1">Telegram para recuperar contraseña</h2>
      <p className="text-xs text-muted mb-3">
        Si vinculás tu Telegram, el link de recuperación te llega directo al chat en segundos — sin depender del email.
      </p>

      <div className="bg-subtle border border-line p-3 text-xs text-content mb-4 space-y-1">
        <p className="font-bold">Cómo obtener tu Chat ID:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted">
          <li>Abrí Telegram y buscá <a href={`https://t.me/${BOT_NAME}`} target="_blank" rel="noopener noreferrer" className="font-mono text-brand-600 underline">@{BOT_NAME}</a></li>
          <li>Tocá <span className="font-mono bg-line px-1">Iniciar / Start</span></li>
          <li>El bot te responde con tu Chat ID — copialo y pegalo abajo</li>
        </ol>
      </div>

      <form onSubmit={guardar} className="flex items-center gap-2">
        <input
          value={chatId}
          onChange={e => setChatId(e.target.value)}
          placeholder="Ej: 123456789"
          className="flex-1 border border-line px-3 h-10 text-sm font-mono outline-none focus:border-brand-600"
        />
        <button
          type="submit"
          disabled={cargando}
          className="bg-slate-900 text-white px-4 h-10 text-xs font-black uppercase border border-line shadow-soft disabled:opacity-50"
        >
          {cargando ? 'Guardando...' : guardado ? 'Guardado' : 'Guardar'}
        </button>
      </form>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
      {chatId && !guardado && <p className="text-xs text-faint mt-1">Chat ID actual: <span className="font-mono">{chatId}</span></p>}
    </div>
  );
};

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
    <div className="mb-8 bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display font-black text-xl uppercase tracking-tight text-content">Plan actual</h2>
          <span className="inline-block mt-1 px-3 py-1 bg-brand-600 text-white text-xs font-black uppercase tracking-wider border border-line">
            {plan.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm border border-line">
          <thead>
            <tr className="bg-slate-900 text-white">
              {['Plan', 'Activos', 'Tecnicos', 'Ficha QR', 'Acceso remoto'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_INFO.map((p, i) => (
              <tr key={p.plan} className={`border-b border-line ${p.plan === plan ? 'bg-brand-50' : i % 2 === 0 ? 'bg-surface' : 'bg-subtle'}`}>
                <td className="px-3 py-2 font-display font-bold">
                  {p.label}
                  {p.plan === plan && <span className="ml-2 text-brand-600 text-xs font-sans">actual</span>}
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
        <div className="border border-line pt-4">
          <div className="bg-warn/10 border border-warn px-4 py-3">
            <p className="font-black text-warn-strong dark:text-warn text-sm uppercase tracking-wide">Solicitud pendiente</p>
            <p className="text-sm text-warn-strong dark:text-warn mt-0.5">
              Plan {PLAN_INFO.find((p) => p.plan === planSolicitadoActual)?.label ?? planSolicitadoActual.toUpperCase()} — en proceso. El equipo de ActivaQR la gestionara a la brevedad.
            </p>
          </div>
        </div>
      )}

      {/* Botones de upgrade */}
      {planesUpgrade.length > 0 && !planSolicitadoActual && !exito && (
        <div className="border border-line pt-4">
          <p className="text-xs font-black uppercase tracking-wider text-muted mb-3">Mejorar plan a:</p>
          <div className="flex flex-wrap gap-2">
            {planesUpgrade.map((p) => (
              <button
                key={p.plan}
                onClick={() => handleSolicitarUpgrade(p.plan)}
                disabled={cargando}
                className="px-5 py-2.5 bg-brand-600 text-white border border-line font-black uppercase tracking-wide shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? 'Enviando...' : `Mejorar plan a ${p.label}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmación */}
      {exito && (
        <div className="border border-line pt-4">
          <div className="bg-ok/10 border border-ok px-4 py-3">
            <p className="font-black text-ok-strong dark:text-ok text-sm uppercase tracking-wide">Solicitud enviada</p>
            <p className="text-sm text-ok-strong dark:text-ok mt-0.5">El equipo de ActivaQR la procesara en breve.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-line pt-4">
          <div className="bg-danger/10 border border-danger px-4 py-3">
            <p className="text-sm font-semibold text-danger-strong dark:text-danger">{error}</p>
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
    <div className="mt-10 border border-line pt-8">
      <h2 className="font-display font-black text-xl uppercase tracking-tight text-content mb-1">
        Suscripción
      </h2>
      <p className="text-sm text-muted mb-4">
        Gestioná tu suscripción activa a ActivaQR.
      </p>

      {cancelada ? (
        <div className="border border-ok bg-ok/10 px-4 py-3 text-sm font-semibold text-ok-strong dark:text-ok">
          Tu suscripción fue cancelada. Los débitos automáticos se detendrán en el próximo ciclo.
        </div>
      ) : (
        <>
          {error && (
            <div className="border border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger mb-3">
              {error}
            </div>
          )}

          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="flex items-center gap-2 border border-danger text-danger px-4 py-2 text-sm font-bold hover:border-danger hover:bg-danger/10 transition-colors"
            >
              <AlertTriangle size={16} />
              Cancelar mi suscripción
            </button>
          ) : (
            <div className="border border-danger bg-danger/10 p-4 space-y-3 max-w-md">
              <p className="text-sm font-black text-danger-strong dark:text-danger uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle size={16} /> Confirmá la cancelación
              </p>
              <p className="text-sm text-danger">
                Esto dará de baja tu suscripción en Mercado Pago. Los débitos automáticos se detendrán. ¿Estás seguro?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelar}
                  disabled={cargando}
                  className="px-4 py-2 bg-danger text-white border border-danger font-bold text-sm disabled:opacity-50"
                >
                  {cargando ? 'Cancelando...' : 'Sí, cancelar suscripción'}
                </button>
                <button
                  onClick={() => { setConfirmando(false); setError(null); }}
                  className="px-4 py-2 border border-line-strong font-bold text-sm text-muted"
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
    <div className="mt-10 border border-line pt-8">
      <h2 className="font-display font-black text-xl uppercase tracking-tight text-content mb-1 flex items-center gap-2">
        <ShieldCheck size={20} className="text-brand-600" /> Acceso remoto de soporte
      </h2>

      {permiso.estado === 'pendiente' && (
        <div className="border border-warn bg-warn/10 p-4 max-w-md space-y-3">
          <p className="text-sm font-black text-warn-strong dark:text-warn uppercase tracking-wide">Solicitud pendiente</p>
          <p className="text-sm text-warn-strong dark:text-warn leading-relaxed">
            El equipo de ActivaQR solicitó acceso remoto a tus activos para brindarte soporte.
            {permiso.costoMensual ? ` Costo adicional: $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
          </p>
          <p className="text-xs text-warn-strong dark:text-warn">Si recibiste el link por email, hacé click en "Aprobar acceso" en ese email.</p>
        </div>
      )}

      {permiso.estado === 'activo' && (
        <div className="space-y-4 max-w-lg">
          <div className="border border-ok bg-ok/10 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ok-strong dark:text-ok uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} /> Acceso activo
              </p>
              <p className="text-xs text-ok-strong dark:text-ok mt-0.5">
                El soporte de ActivaQR puede ver tus activos y mediciones.
                {permiso.costoMensual ? ` $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
              </p>
            </div>
            {!revocar ? (
              <button
                onClick={() => setRevocar(true)}
                className="flex items-center gap-1 text-xs font-bold text-danger border border-danger px-3 py-2 hover:border-danger transition-colors whitespace-nowrap"
              >
                <ShieldOff size={13} /> Revocar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleRevocar} className="text-xs font-bold bg-danger text-white border border-danger px-3 py-2">Confirmar</button>
                <button onClick={() => setRevocar(false)} className="text-xs font-bold border border-line px-3 py-2">No</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMostrarChat((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold border border-line px-4 py-2 hover:bg-subtle transition-colors"
          >
            <MessageSquare size={16} />
            {mostrarChat ? 'Ocultar chat' : 'Abrir chat con soporte'}
          </button>

          {mostrarChat && (
            <ChatRemoto
              mensajes={mensajes}
              miRol="cliente"
              onEnviar={async (payload) => {
                const m = await enviarMensajeCliente(payload);
                setMensajes((prev) => [...prev, m]);
              }}
            />
          )}
        </div>
      )}

      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
        <h2 className="font-display text-xl font-black uppercase tracking-wide text-content mb-3">Guia de inicio</h2>
        <p className="text-sm text-muted mb-4">Revive el tour de bienvenida que aparece al usar la app por primera vez.</p>
        <button
          onClick={() => { localStorage.removeItem('activaqr_tour_done'); window.location.reload(); }}
          className="flex items-center gap-2 bg-surface text-content px-4 py-2 font-bold border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-soft transition-all text-sm"
        >
          <RotateCcw size={15} />
          Reactivar guia de inicio
        </button>
      </div>
    </div>
  );
};
