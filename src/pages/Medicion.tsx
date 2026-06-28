// v1.1.0
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, CheckCircle, ArrowLeft, ClipboardList, Camera, AlertTriangle, Zap } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { QrScanner, extraerActivoId } from '../components/QrScanner';
import { Medicion as MedicionType, EstadoMedicion, Activo } from '../data/types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button, Card, EmptyState, Input, Select, Textarea } from '../components/ui';
import { CategoriaEquipo, ParametroCategoria, getCategoria } from '../data/categoriasApi';

// ── Lógica de alertas (espejo del backend) ────────────────────────────────────
type NivelAlerta = 'normal' | 'alerta' | 'critico' | 'urgente';
const NIVEL: Record<NivelAlerta, number> = { normal: 0, alerta: 1, critico: 2, urgente: 3 };
const peor = (a: NivelAlerta, b: NivelAlerta): NivelAlerta => NIVEL[a] >= NIVEL[b] ? a : b;

function evalMax(v: number, alerta?: number | null, critico?: number | null, max?: number | null): NivelAlerta {
  if (max != null && v > max) return 'urgente';
  if (critico != null && v >= critico) return 'critico';
  if (alerta != null && v >= alerta) return 'alerta';
  return 'normal';
}
function evalMin(v: number, alerta?: number | null, critico?: number | null): NivelAlerta {
  if (critico != null && v <= critico) return 'urgente';
  if (alerta != null && v <= alerta) return 'critico';
  return 'normal';
}

function calcularEstado(form: Record<string, string>, activo: Activo): NivelAlerta {
  let e: NivelAlerta = 'normal';
  const t = parseFloat(form.temperatura);
  if (!isNaN(t)) {
    e = peor(e, evalMax(t, activo.temperaturaAlerta, activo.temperaturaCritica, activo.temperaturaMax));
    // Temperatura por debajo del minimo tambien es anormal
    if (activo.temperaturaMin != null && t < activo.temperaturaMin) e = peor(e, 'alerta');
  }
  const a = parseFloat(form.amperaje);
  if (!isNaN(a)) {
    e = peor(e, evalMax(a, (activo as any).amperajeAlerta, (activo as any).amperajeCritico));
    if ((activo as any).amperajeNormal > 0 && a === 0) e = peor(e, 'alerta');
  }
  const p = parseFloat(form.presion);
  if (!isNaN(p)) {
    e = peor(e, evalMax(p, (activo as any).presionAlerta, (activo as any).presionCritica));
    if ((activo as any).presionNormal > 0 && p === 0) e = peor(e, 'alerta');
  }
  const v = parseFloat(form.voltaje);
  if (!isNaN(v)) {
    if (v === 0) e = peor(e, 'critico');
    if ((activo as any).voltajeMin != null && v < (activo as any).voltajeMin) e = peor(e, 'alerta');
    if ((activo as any).voltajeMax != null && v > (activo as any).voltajeMax) e = peor(e, 'alerta');
  }
  const bat = parseInt(form.porcentajeBateria);
  if (!isNaN(bat)) e = peor(e, evalMin(bat, (activo as any).bateriaAlerta, (activo as any).bateriaCritica));
  const ton = parseInt(form.nivelToner);
  if (!isNaN(ton)) e = peor(e, evalMin(ton, (activo as any).tonerAlerta, (activo as any).tonerCritico));
  // Vibracion: moderada = alerta, alta = critico
  if (form.vibracion === 'alta') e = peor(e, 'critico');
  else if (form.vibracion === 'moderada') e = peor(e, 'alerta');
  return e;
}

// Barra de progreso con color según posición en el rango.
function BarraUmbral({ valor, min, alerta, critico, max, invertido = false }: {
  valor: string; min?: number | null; alerta?: number | null;
  critico?: number | null; max?: number | null; invertido?: boolean;
}) {
  const v = parseFloat(valor);
  if (isNaN(v) || (alerta == null && critico == null && max == null)) return null;

  const nivel = invertido
    ? evalMin(v, alerta, critico)
    : evalMax(v, alerta, critico, max);

  const color = nivel === 'urgente' ? 'bg-danger'
    : nivel === 'critico' ? 'bg-danger/70'
    : nivel === 'alerta' ? 'bg-warn'
    : 'bg-ok';

  const label = nivel === 'urgente' ? 'INTERVENCIÓN URGENTE'
    : nivel === 'critico' ? 'CRÍTICO'
    : nivel === 'alerta' ? 'ALERTA'
    : 'Normal';

  const pct = (() => {
    if (invertido) {
      const top = alerta ?? 100;
      return Math.min(100, Math.max(0, (1 - v / top) * 100));
    }
    const top = max ?? critico ?? alerta ?? v;
    return Math.min(100, Math.max(5, (v / top) * 100));
  })();

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-2 bg-subtle rounded-sm border border-line overflow-hidden">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {nivel !== 'normal' && (
        <p className={`text-xs font-semibold ${
          nivel === 'urgente' ? 'text-danger' : nivel === 'critico' ? 'text-danger' : 'text-warn-strong dark:text-warn'
        }`}>{label}</p>
      )}
    </div>
  );
}

// ─── Componente de parámetro dinámico ────────────────────────────────────────

function ParamDinamicoInput({
  param,
  value,
  onChange,
}: {
  param: ParametroCategoria;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const strVal = value === undefined || value === null ? '' : String(value);

  if (param.tipo === 'booleano') {
    const boolVal = value === true || value === 'true';
    return (
      <div className="mb-4">
        <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
          {param.nombre}
        </label>
        <div className="flex gap-2">
          {[true, false].map((b) => (
            <button
              key={String(b)}
              type="button"
              onClick={() => onChange(b)}
              className={`press flex-1 h-11 rounded-md font-semibold border transition-colors ${
                boolVal === b
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-line text-muted hover:border-line-strong bg-surface'
              }`}
            >
              {b ? 'Sí' : 'No'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (param.tipo === 'texto') {
    return (
      <div className="mb-4">
        <Input
          label={param.nombre}
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // numerico / porcentaje
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
        {param.nombre}{param.unidad ? ` (${param.unidad})` : ''}
        {param.obligatorio && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type="number"
        step={param.tipo === 'porcentaje' ? '1' : '0.1'}
        min={param.tipo === 'porcentaje' ? '0' : undefined}
        max={param.tipo === 'porcentaje' ? '100' : undefined}
        required={param.obligatorio}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
        placeholder="0"
      />
      <BarraUmbral
        valor={strVal}
        min={param.minNormal}
        alerta={param.umbralAlerta}
        critico={param.umbralCritico}
        max={param.umbralUrgente}
        invertido={param.invertido}
      />
    </div>
  );
}

export const Medicion: React.FC = () => {
  const { activoId } = useParams<{ activoId: string }>();
  const navigate = useNavigate();
  const { activos, mediciones, tecnicos, addMedicion, updateActivo, getSectorNombre, getTipo, getTecnicoNombre } = useActivos();
  const tecnicosActivos = tecnicos.filter((t) => t.activo);

  const [searchCodigo, setSearchCodigo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savedMedicion, setSavedMedicion] = useState<MedicionType | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  const onEscaneo = (texto: string) => {
    setEscaneando(false);
    const id = extraerActivoId(texto);
    if (id && activos.some((a) => a.id === id)) {
      navigate(`/medicion/${id}`);
    } else {
      alert('El QR no corresponde a un activo de esta cuenta.');
    }
  };

  // Find activo by id or by codigo search
  let activo = activos.find((a) => a.id === activoId);
  if (!activo && searchCodigo) {
    activo = activos.find((a) =>
      a.codigo.toLowerCase() === searchCodigo.toLowerCase()
    );
  }

  const lastMedicion = activo
    ? mediciones
        .filter((m) => m.activoId === activo!.id)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
    : undefined;

  const tipoActivo = activo ? getTipo(activo.tipoId) : undefined;
  // Por defecto mostramos todo si no encontramos el tipo (compat).
  const mideTemperatura = tipoActivo ? tipoActivo.mideTemperatura : true;
  const mideAmperaje = tipoActivo ? tipoActivo.mideAmperaje : activo ? activo.amperajeNormal > 0 : true;
  const midePresion = tipoActivo ? tipoActivo.midePresion : activo ? activo.presionNormal > 0 : true;
  const mideVibracion = tipoActivo ? tipoActivo.mideVibracion : true;
  const mideVoltaje = tipoActivo?.mideVoltaje ?? false;
  const mideBateria = tipoActivo?.mideBateria ?? false;
  const mideToner = tipoActivo?.mideToner ?? false;
  const mideContador = tipoActivo?.mideContador ?? false;

  // Categoría dinámica
  const [categoria, setCategoria] = useState<CategoriaEquipo | null>(null);
  useEffect(() => {
    const catId = tipoActivo?.categoriaId;
    if (!catId) { setCategoria(null); return; }
    getCategoria(catId).then(setCategoria).catch(() => setCategoria(null));
  }, [tipoActivo?.categoriaId]);

  const [form, setForm] = useState({
    temperatura: '',
    amperaje: '',
    presion: '',
    vibracion: 'ninguna' as MedicionType['vibracion'],
    horasMarcha: '',
    voltaje: '',
    porcentajeBateria: '',
    nivelToner: '',
    contador: '',
    estado: 'normal' as EstadoMedicion,
    observaciones: '',
    tecnicoId: '',
  });

  // Dynamic extra params from category
  const [parametrosExtra, setParametrosExtra] = useState<Record<string, string | number | boolean>>({});
  const setParamExtra = (clave: string, val: string | number | boolean) =>
    setParametrosExtra((p) => ({ ...p, [clave]: val }));

  // Estado calculado automáticamente en tiempo real.
  const estadoAuto = useMemo(
    () => activo ? calcularEstado(form, activo) : 'normal',
    [form, activo],
  );

  // El estado manual solo se muestra si supera al automático.
  const tieneUmbrales = activo && (
    activo.temperaturaAlerta != null || activo.temperaturaCritica != null ||
    (activo as any).amperajeAlerta != null || (activo as any).presionAlerta != null ||
    (activo as any).bateriaAlerta != null || (activo as any).tonerAlerta != null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activo) return;
    const newMedicion: MedicionType = {
      id: `med-${Date.now()}`,
      activoId: activo.id,
      fecha: format(new Date(), 'yyyy-MM-dd'),
      temperatura: parseFloat(form.temperatura) || 0,
      amperaje: parseFloat(form.amperaje) || 0,
      presion: parseFloat(form.presion) || 0,
      vibracion: form.vibracion,
      horasMarcha: parseInt(form.horasMarcha) || 0,
      ...(mideVoltaje && form.voltaje !== '' ? { voltaje: parseFloat(form.voltaje) } : {}),
      ...(mideBateria && form.porcentajeBateria !== '' ? { porcentajeBateria: parseInt(form.porcentajeBateria) } : {}),
      ...(mideToner && form.nivelToner !== '' ? { nivelToner: parseInt(form.nivelToner) } : {}),
      ...(mideContador && form.contador !== '' ? { contador: parseInt(form.contador) } : {}),
      estado: (() => {
        // El estado de la medicion es el peor entre el manual y el automatico.
        const autoMed: EstadoMedicion = estadoAuto === 'urgente' ? 'urgente'
          : estadoAuto === 'critico' || estadoAuto === 'alerta' ? 'revision'
          : 'normal';
        const niv: Record<string, number> = { normal: 0, revision: 1, urgente: 2 };
        return (niv[form.estado] ?? 0) >= (niv[autoMed] ?? 0) ? form.estado : autoMed;
      })(),
      observaciones: form.observaciones,
      tecnicoId: form.tecnicoId,
      ...(Object.keys(parametrosExtra).length > 0 ? { parametrosExtra } : {}),
    };
    addMedicion(newMedicion);

    // Actualizar la etiqueta del activo segun el estado calculado.
    // Solo escalamos (nunca bajamos automaticamente: requiere revision manual).
    const nivelActivo: Record<string, number> = { normal: 0, alerta: 1, mantenimiento: 1, critico: 2 };
    const estadoActivoCalc: 'normal' | 'alerta' | 'critico' =
      estadoAuto === 'urgente' || estadoAuto === 'critico' ? 'critico'
      : estadoAuto === 'alerta' ? 'alerta'
      : 'normal';
    if ((nivelActivo[estadoActivoCalc] ?? 0) > (nivelActivo[activo.estado] ?? 0)) {
      updateActivo(activo.id, { estado: estadoActivoCalc });
    }

    setSavedMedicion(newMedicion);
    setSubmitted(true);
  };

  // Success screen
  if (submitted && savedMedicion && activo) {
    return (
      <div className="max-w-lg mx-auto">
        <Card padding="md" className="text-center">
          <CheckCircle size={48} className="text-ok mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-content mb-1">Medición registrada</h2>
          <div className="font-mono font-bold text-brand-600 text-xl mb-4">{activo.codigo}</div>
          <div className="text-left bg-subtle border border-line rounded-md p-4 space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-muted">Fecha</span>
              <span className="font-mono text-sm text-content">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-muted">Temperatura</span>
              <span className="font-mono font-bold text-sm text-content">{savedMedicion.temperatura}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-muted">Estado</span>
              <StatusBadge estado={savedMedicion.estado} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-muted">Técnico</span>
              <span className="text-sm text-content">{getTecnicoNombre(savedMedicion.tecnicoId)}</span>
            </div>
            {savedMedicion.observaciones && (
              <div>
                <span className="text-xs font-semibold text-muted block">Observaciones</span>
                <span className="text-sm text-muted">{savedMedicion.observaciones}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', horasMarcha: '', voltaje: '', porcentajeBateria: '', nivelToner: '', contador: '', estado: 'normal', observaciones: '', tecnicoId: '' });
              setParametrosExtra({});
              }}
              className="flex-1"
            >
              Nueva Medición
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/activos/${activo!.id}`)}
              variant="secondary"
              className="flex-1"
            >
              Ver Activo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-4 animate-fade-up">
      {escaneando && (
        <QrScanner onResult={onEscaneo} onClose={() => setEscaneando(false)} />
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={18} />
        </Button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Tomar medición</h1>
      </div>

      {/* Search by código */}
      {!activoId && (
        <Card padding="md">
          <label className="block text-xs font-semibold text-muted tracking-wide mb-2">Buscar por código de activo</label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border border-line rounded-md bg-surface px-3 h-14 flex-1 focus-within:border-brand-600 focus-within:shadow-ring">
              <Search size={18} className="text-faint flex-shrink-0" />
              <input
                type="text"
                placeholder="Ej: HOR-MOT-001"
                value={searchCodigo}
                onChange={(e) => setSearchCodigo(e.target.value)}
                className="flex-1 outline-none text-xl font-mono uppercase bg-transparent text-content placeholder:text-faint min-w-0"
              />
            </div>
            <Button
              type="button"
              onClick={() => setEscaneando(true)}
              title="Escanear QR"
              className="h-14"
              iconLeft={<Camera size={20} />}
            >
              <span className="hidden sm:inline">Escanear</span>
            </Button>
          </div>
          {searchCodigo && !activo && (
            <p className="text-danger text-sm mt-2 font-semibold">Activo no encontrado</p>
          )}
        </Card>
      )}

      {activoId && !activo && (
        <Card padding="md" className="text-center">
          <p className="font-display font-bold text-lg text-content mb-1">Activo no encontrado</p>
          <p className="text-muted text-sm mb-4">Este equipo no pertenece a tu cuenta o todavía se está cargando.</p>
          <a
            href={`#/ficha/${activoId}`}
            className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Ver ficha del equipo
          </a>
        </Card>
      )}

      {activo && (
        <>
          {/* Activo info */}
          <Card padding="md">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono font-bold text-3xl text-brand-600">{activo.codigo}</div>
                <div className="font-semibold text-content text-sm">{activo.nombre}</div>
                <div className="text-muted text-xs mt-0.5">{getSectorNombre(activo.sectorId)} / {activo.ubicacion}</div>
              </div>
              <StatusBadge estado={activo.estado} />
            </div>
            {lastMedicion && (
              <div className="mt-3 pt-3 border-t border-line text-xs text-muted">
                Última medición: {format(parseISO(lastMedicion.fecha), 'dd/MM/yyyy', { locale: es })} —
                {' '}<span className="text-brand-600 font-mono">{lastMedicion.temperatura}°C</span>
              </div>
            )}
          </Card>

          {/* Banner de alerta automática */}
          {estadoAuto !== 'normal' && (
            <div className={`border rounded-md px-4 py-3 flex items-center gap-3 ${
              estadoAuto === 'urgente'
                ? 'border-danger bg-danger text-white'
                : estadoAuto === 'critico'
                ? 'border-danger/50 bg-danger/10 text-danger-strong dark:text-danger'
                : 'border-warn/50 bg-warn/10 text-warn-strong dark:text-warn'
            }`}>
              {estadoAuto === 'urgente' ? <Zap size={20} /> : <AlertTriangle size={20} />}
              <div>
                <p className="font-bold text-sm">
                  {estadoAuto === 'urgente' ? 'Intervención urgente requerida'
                    : estadoAuto === 'critico' ? 'Estado crítico detectado'
                    : 'Valor fuera del rango normal'}
                </p>
                {estadoAuto === 'urgente' && (
                  <p className="text-xs mt-0.5 font-semibold">Considerá detener el equipo y notificar al responsable.</p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <Card as="section" padding="md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Temperature */}
            {mideTemperatura && (
            <div>
              <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
                Temperatura (°C)
                {lastMedicion && <span className="ml-2 text-faint font-normal">Anterior: {lastMedicion.temperatura}°C</span>}
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={form.temperatura}
                onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))}
                className="w-full border border-line rounded-md bg-surface px-4 h-14 text-2xl font-mono font-bold text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                placeholder="0.0"
              />
              <BarraUmbral valor={form.temperatura}
                alerta={activo.temperaturaAlerta} critico={activo.temperaturaCritica} max={activo.temperaturaMax} />
            </div>
            )}

            {/* Amperaje */}
            {mideAmperaje && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
                  Amperaje (A)
                  <span className="ml-2 text-faint font-normal">Normal: {activo.amperajeNormal}A</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.amperaje}
                  onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.amperaje}
                  alerta={(activo as any).amperajeAlerta} critico={(activo as any).amperajeCritico} />
              </div>
            )}

            {/* Presión */}
            {midePresion && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">
                  Presión (bar)
                  <span className="ml-2 text-faint font-normal">Normal: {activo.presionNormal} bar</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.presion}
                  onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0.0"
                />
                <BarraUmbral valor={form.presion}
                  alerta={(activo as any).presionAlerta} critico={(activo as any).presionCritica} />
              </div>
            )}

            {/* Vibración */}
            {mideVibracion && (
            <div>
              <label className="block text-xs font-semibold text-muted tracking-wide mb-2">Vibración</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ninguna', 'leve', 'moderada', 'alta'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, vibracion: v }))}
                    className={`press h-12 rounded-md text-sm font-semibold border transition-colors ${
                      form.vibracion === v
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-line text-muted hover:border-line-strong bg-surface'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Horas marcha */}
            <div>
              <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Horas de marcha</label>
              <input
                type="number"
                value={form.horasMarcha}
                onChange={(e) => setForm((p) => ({ ...p, horasMarcha: e.target.value }))}
                className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                placeholder={String(activo.horasActuales)}
              />
            </div>

            {/* Voltaje */}
            {mideVoltaje && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Voltaje (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.voltaje}
                  onChange={(e) => setForm((p) => ({ ...p, voltaje: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Batería */}
            {mideBateria && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Batería (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentajeBateria}
                  onChange={(e) => setForm((p) => ({ ...p, porcentajeBateria: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0"
                />
                <BarraUmbral valor={form.porcentajeBateria}
                  alerta={(activo as any).bateriaAlerta} critico={(activo as any).bateriaCritica} invertido />
              </div>
            )}

            {/* Nivel de tóner */}
            {mideToner && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Nivel de tóner (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.nivelToner}
                  onChange={(e) => setForm((p) => ({ ...p, nivelToner: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0"
                />
                <BarraUmbral valor={form.nivelToner}
                  alerta={(activo as any).tonerAlerta} critico={(activo as any).tonerCritico} invertido />
              </div>
            )}

            {/* Contador */}
            {mideContador && (
              <div>
                <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Contador (páginas/ciclos)</label>
                <input
                  type="number"
                  value={form.contador}
                  onChange={(e) => setForm((p) => ({ ...p, contador: e.target.value }))}
                  className="w-full border border-line rounded-md bg-surface px-4 h-14 text-xl font-mono text-content outline-none focus:border-brand-600 focus:shadow-ring text-center"
                  placeholder="0"
                />
              </div>
            )}

            {/* Parámetros dinámicos de la categoría */}
            {categoria && categoria.parametros.length > 0 && (
              <div className="space-y-4">
                <div className="border-t border-line pt-3">
                  <p className="text-xs font-semibold text-muted mb-3">
                    {categoria.icono} {categoria.nombre}
                  </p>
                  {categoria.parametros.map((param) => (
                    <ParamDinamicoInput
                      key={param.id}
                      param={param}
                      value={parametrosExtra[param.clave]}
                      onChange={(v) => setParamExtra(param.clave, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Estado visual — tarjetas grandes */}
            <div>
              <label className="block text-xs font-semibold text-muted tracking-wide mb-1">Estado visual</label>
              {tieneUmbrales && estadoAuto !== 'normal' && (
                <p className="text-xs text-muted mb-2">
                  El sistema calculó <strong className={estadoAuto === 'urgente' ? 'text-danger-strong dark:text-danger' : estadoAuto === 'critico' ? 'text-danger' : 'text-warn-strong dark:text-warn'}>
                    {estadoAuto.toUpperCase()}
                  </strong> automáticamente. Podés confirmarlo o escalarlo manualmente.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'normal' }))}
                  className={`press w-full h-12 rounded-md font-semibold border transition-all ${
                    form.estado === 'normal'
                      ? 'bg-ok text-white border-ok'
                      : 'bg-surface text-ok-strong dark:text-ok border-line hover:border-ok'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'revision' }))}
                  className={`press w-full h-12 rounded-md font-semibold border transition-all ${
                    form.estado === 'revision'
                      ? 'bg-warn text-white border-warn'
                      : 'bg-surface text-warn-strong dark:text-warn border-line hover:border-warn'
                  }`}
                >
                  Revisión
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, estado: 'urgente' }))}
                  className={`press w-full h-12 rounded-md font-semibold border transition-all ${
                    form.estado === 'urgente'
                      ? 'bg-danger text-white border-danger'
                      : 'bg-surface text-danger-strong dark:text-danger border-line hover:border-danger'
                  }`}
                >
                  Urgente
                </button>
              </div>
            </div>

            {/* Observaciones */}
            <Textarea
              label="Observaciones"
              value={form.observaciones}
              onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
              rows={3}
              placeholder="Notas adicionales sobre el estado del equipo..."
            />

            {/* Técnico */}
            <Select
              required
              label="Técnico responsable"
              value={form.tecnicoId}
              onChange={(e) => setForm((p) => ({ ...p, tecnicoId: e.target.value }))}
              className="text-base"
            >
              <option value="">Seleccionar técnico...</option>
              {tecnicosActivos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>

            {/* Submit sticky en mobile */}
            <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto p-4 md:p-0 bg-canvas/95 md:bg-transparent border-t border-line md:border-0 z-30 backdrop-blur-sm md:backdrop-blur-none">
              <Button
                type="submit"
                block
                size="lg"
              >
                Registrar Medición
              </Button>
            </div>
          </form>
          </Card>
        </>
      )}

      {!activo && !activoId && (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title="Escaneá un QR o buscá por código"
        />
      )}
    </div>
  );
};
