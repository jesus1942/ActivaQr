// v1.0.0
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../data/auth';
import { useAuth } from '../context/AuthContext';

interface ActivoResumen {
  id: string;
  codigo: string;
  nombre: string;
  estado: 'normal' | 'alerta' | 'critico' | 'mantenimiento';
  mediciones: { fecha: string }[];
}

interface FormMedicion {
  temperatura: string;
  amperaje: string;
  presion: string;
  vibracion: 'ninguna' | 'leve' | 'moderada' | 'alta';
  observaciones: string;
}

const ESTADO_BADGE: Record<string, string> = {
  normal:        'bg-emerald-100 border-emerald-400 text-emerald-700',
  alerta:        'bg-amber-100 border-amber-400 text-amber-700',
  critico:       'bg-red-100 border-red-500 text-red-700',
  mantenimiento: 'bg-blue-100 border-blue-400 text-blue-700',
};

const VIBRACION_OPTS: FormMedicion['vibracion'][] = ['ninguna', 'leve', 'moderada', 'alta'];

const inputCls = 'w-full border-2 border-slate-300 px-3 h-12 text-base outline-none focus:border-orange-500 bg-white';
const labelCls = 'block text-xs font-black uppercase tracking-wider text-slate-600 mb-1';

export const DashboardOperador: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [activos, setActivos] = useState<ActivoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activoSeleccionado, setActivoSeleccionado] = useState<ActivoResumen | null>(null);
  const [form, setForm] = useState<FormMedicion>({
    temperatura: '',
    amperaje: '',
    presion: '',
    vibracion: 'ninguna',
    observaciones: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMedicion, setErrorMedicion] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('activos')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setActivos(data);
        else setError('Error al cargar activos');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const abrirMedicion = (activo: ActivoResumen) => {
    setActivoSeleccionado(activo);
    setForm({ temperatura: '', amperaje: '', presion: '', vibracion: 'ninguna', observaciones: '' });
    setExito(false);
    setErrorMedicion(null);
  };

  const cerrarMedicion = () => {
    setActivoSeleccionado(null);
    setExito(false);
    setErrorMedicion(null);
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoSeleccionado) return;
    setEnviando(true);
    setErrorMedicion(null);
    try {
      const body: Record<string, unknown> = {
        activoId: activoSeleccionado.id,
        vibracion: form.vibracion,
        observaciones: form.observaciones || undefined,
      };
      if (form.temperatura !== '') body.temperatura = parseFloat(form.temperatura);
      if (form.amperaje !== '') body.amperaje = parseFloat(form.amperaje);
      if (form.presion !== '') body.presion = parseFloat(form.presion);

      const res = await apiFetch('mediciones', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar medicion');

      setExito(true);
      // Actualizar el activo con la nueva medicion en la lista local
      setActivos((prev) =>
        prev.map((a) =>
          a.id === activoSeleccionado.id
            ? { ...a, estado: data.estado ?? a.estado, mediciones: [{ fecha: data.fecha ?? new Date().toISOString() }] }
            : a
        )
      );
    } catch (err) {
      setErrorMedicion(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setEnviando(false);
    }
  };

  // ── Vista: formulario de medicion ────────────────────────────
  if (activoSeleccionado) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-slate-900 text-white px-5 py-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400 mb-0.5">Registrar medicion</p>
            <h1 className="font-black text-xl leading-tight">{activoSeleccionado.nombre}</h1>
            <p className="text-sm text-slate-300">{activoSeleccionado.codigo}</p>
          </div>

          {exito ? (
            <div className="bg-white border-2 border-emerald-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-6 text-center space-y-4">
              <p className="font-black text-2xl text-emerald-700 uppercase">Registrada</p>
              <p className="text-slate-600 text-sm">La medicion fue guardada correctamente.</p>
              <button
                onClick={cerrarMedicion}
                className="w-full min-h-[52px] bg-slate-900 text-white font-black border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] text-base uppercase tracking-wide"
              >
                Volver a la lista
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnviar} className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-5 space-y-4">
              {errorMedicion && (
                <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMedicion}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Temperatura (C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.temperatura}
                    onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))}
                    className={inputCls}
                    placeholder="25.0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Amperaje (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.amperaje}
                    onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))}
                    className={inputCls}
                    placeholder="10.0"
                  />
                </div>
                <div>
                  <label className={labelCls}>Presion (bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.presion}
                    onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))}
                    className={inputCls}
                    placeholder="1.5"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Vibracion</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIBRACION_OPTS.map((v) => (
                    <label key={v} className={`flex items-center gap-3 border-2 px-3 min-h-[52px] cursor-pointer font-bold text-base capitalize transition-colors ${form.vibracion === v ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-300 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="vibracion"
                        value={v}
                        checked={form.vibracion === v}
                        onChange={() => setForm((p) => ({ ...p, vibracion: v }))}
                        className="w-4 h-4"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-2 text-base outline-none focus:border-orange-500 bg-white min-h-[80px] resize-none"
                  placeholder="Novedades, ruidos, olores, etc."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarMedicion}
                  className="flex-1 min-h-[52px] border-2 border-slate-400 font-bold text-slate-600 text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-[2] min-h-[52px] bg-orange-500 text-white font-black border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] text-base uppercase tracking-wide disabled:opacity-50"
                >
                  {enviando ? 'Guardando...' : 'Registrar medicion'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: lista de activos ───────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">ActivaQR</p>
            <p className="font-black text-lg leading-tight">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400">{usuario?.empresa?.nombre}</p>
          </div>
          <button
            onClick={logout}
            className="border-2 border-slate-600 text-slate-300 px-3 py-2 text-xs font-bold uppercase hover:border-slate-300 transition-colors"
          >
            Salir
          </button>
        </div>

        <h2 className="font-black text-xl uppercase tracking-tight text-slate-800 px-1">
          Activos a controlar
        </h2>

        {error && (
          <div className="border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        )}

        {cargando ? (
          <p className="text-slate-400 font-semibold px-1">Cargando activos...</p>
        ) : activos.length === 0 ? (
          <p className="text-slate-400 text-sm italic px-1">No hay activos registrados en la empresa.</p>
        ) : (
          <div className="space-y-3">
            {activos.map((activo) => {
              const ultimaMedicion = activo.mediciones?.[0];
              const estadoCls = ESTADO_BADGE[activo.estado] ?? 'bg-slate-100 border-slate-300 text-slate-600';
              return (
                <div
                  key={activo.id}
                  className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider text-orange-500">{activo.codigo}</p>
                      <h3 className="font-black text-lg text-slate-900 leading-tight truncate">{activo.nombre}</h3>
                      {ultimaMedicion && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Ultima medicion: {ultimaMedicion.fecha.slice(0, 10)}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-black uppercase px-2 py-1 border-2 whitespace-nowrap flex-shrink-0 ${estadoCls}`}>
                      {activo.estado}
                    </span>
                  </div>
                  <button
                    onClick={() => abrirMedicion(activo)}
                    className="w-full min-h-[52px] bg-orange-500 text-white font-black border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] text-base uppercase tracking-wide hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                  >
                    Registrar medicion
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
