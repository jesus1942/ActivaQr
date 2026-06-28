// v1.1.0
import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { apiFetch } from '../data/auth';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Textarea, StatusBadge } from '../components/ui';
import { EstadoActivo } from '../data/types';

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

const VIBRACION_OPTS: FormMedicion['vibracion'][] = ['ninguna', 'leve', 'moderada', 'alta'];

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5';

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
      <div className="min-h-screen bg-canvas px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          <Card padding="md" className="border-l-4 border-l-brand-600">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-0.5">Registrar medición</p>
            <h1 className="font-display font-bold text-xl leading-tight text-content">{activoSeleccionado.nombre}</h1>
            <p className="text-sm text-muted">{activoSeleccionado.codigo}</p>
          </Card>

          {exito ? (
            <Card padding="lg" className="text-center space-y-4 border-l-4 border-l-ok">
              <p className="font-display font-bold text-2xl text-ok-strong dark:text-ok uppercase">Registrada</p>
              <p className="text-muted text-sm">La medición fue guardada correctamente.</p>
              <Button block size="lg" onClick={cerrarMedicion}>
                Volver a la lista
              </Button>
            </Card>
          ) : (
            <Card as="section" padding="md">
              <form onSubmit={handleEnviar} className="space-y-4">
                {errorMedicion && (
                  <div className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger rounded-md">
                    {errorMedicion}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Temperatura (C)"
                    type="number"
                    step="0.1"
                    value={form.temperatura}
                    onChange={(e) => setForm((p) => ({ ...p, temperatura: e.target.value }))}
                    placeholder="25.0"
                  />
                  <Input
                    label="Amperaje (A)"
                    type="number"
                    step="0.1"
                    value={form.amperaje}
                    onChange={(e) => setForm((p) => ({ ...p, amperaje: e.target.value }))}
                    placeholder="10.0"
                  />
                  <Input
                    label="Presión (bar)"
                    type="number"
                    step="0.1"
                    value={form.presion}
                    onChange={(e) => setForm((p) => ({ ...p, presion: e.target.value }))}
                    placeholder="1.5"
                  />
                </div>

                <div>
                  <label className={labelCls}>Vibración</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIBRACION_OPTS.map((v) => (
                      <label
                        key={v}
                        className={`flex items-center gap-3 border rounded-md px-3 min-h-[52px] cursor-pointer font-semibold text-base capitalize transition-colors ${
                          form.vibracion === v
                            ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                            : 'border-line text-muted hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="radio"
                          name="vibracion"
                          value={v}
                          checked={form.vibracion === v}
                          onChange={() => setForm((p) => ({ ...p, vibracion: v }))}
                          className="w-4 h-4 accent-brand-600"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Observaciones"
                  value={form.observaciones}
                  onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Novedades, ruidos, olores, etc."
                />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={cerrarMedicion}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="lg" className="flex-[2]" loading={enviando} disabled={enviando}>
                    {enviando ? 'Guardando...' : 'Registrar medición'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: lista de activos ───────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <Card padding="md" className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">ActivaQR</p>
            <p className="font-display font-bold text-lg leading-tight text-content truncate">{usuario?.nombre}</p>
            <p className="text-xs text-muted truncate">{usuario?.empresa?.nombre}</p>
          </div>
          <Button variant="ghost" size="sm" iconLeft={<LogOut size={16} />} onClick={logout}>
            Salir
          </Button>
        </Card>

        <h2 className="font-display font-bold text-xl tracking-tight text-content px-1">
          Activos a controlar
        </h2>

        {error && (
          <div className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger-strong dark:text-danger rounded-md">{error}</div>
        )}

        {cargando ? (
          <p className="text-muted font-semibold px-1">Cargando activos...</p>
        ) : activos.length === 0 ? (
          <p className="text-muted text-sm italic px-1">No hay activos registrados en la empresa.</p>
        ) : (
          <div className="space-y-3">
            {activos.map((activo) => {
              const ultimaMedicion = activo.mediciones?.[0];
              return (
                <Card key={activo.id} padding="md">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{activo.codigo}</p>
                      <h3 className="font-display font-bold text-lg text-content leading-tight truncate">{activo.nombre}</h3>
                      {ultimaMedicion && (
                        <p className="text-xs text-faint mt-0.5">
                          Última medición: {ultimaMedicion.fecha.slice(0, 10)}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge estado={activo.estado as EstadoActivo} size="sm" />
                    </div>
                  </div>
                  <Button block size="lg" onClick={() => abrirMedicion(activo)}>
                    Registrar medición
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
