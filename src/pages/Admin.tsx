// v1.0
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Power,
  Trash2,
  KeyRound,
  Users,
  Package,
  CreditCard,
  XCircle,
  MonitorSmartphone,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  EmpresaAdmin,
  SolicitudUpgrade,
  listarEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  resetPassword,
  generarSuscripcion,
  cancelarSuscripcion,
  getSolicitudesUpgrade,
  descartarSolicitud,
} from '../data/adminApi';
import {
  PermisoAcceso,
  solicitarAccesoRemoto,
  getPermisoAdmin,
  revocarAccesoAdmin,
} from '../data/accesoRemotoApi';
import { PanelAccesoRemoto } from '../components/PanelAccesoRemoto';

const PLANES = ['inicial', 'empresa', 'industrial'] as const;

// ── Modal selector de WhatsApp ────────────────────────────────────────────────
const CODIGOS_PAIS = [
  { codigo: '54',  bandera: 'AR', nombre: 'Argentina' },
  { codigo: '598', bandera: 'UY', nombre: 'Uruguay' },
  { codigo: '595', bandera: 'PY', nombre: 'Paraguay' },
  { codigo: '591', bandera: 'BO', nombre: 'Bolivia' },
  { codigo: '56',  bandera: 'CL', nombre: 'Chile' },
  { codigo: '55',  bandera: 'BR', nombre: 'Brasil' },
  { codigo: '51',  bandera: 'PE', nombre: 'Perú' },
  { codigo: '57',  bandera: 'CO', nombre: 'Colombia' },
  { codigo: '34',  bandera: 'ES', nombre: 'España' },
  { codigo: '1',   bandera: 'US', nombre: 'EE.UU. / Canadá' },
];

const ModalWhatsapp: React.FC<{
  titulo: string;
  nombreEmpresa: string;
  onConfirm: (numeroCompleto: string) => void;
  onOmitir: () => void;
}> = ({ titulo, nombreEmpresa, onConfirm, onOmitir }) => {
  const [pais, setPais] = useState(CODIGOS_PAIS[0]);
  const [numero, setNumero] = useState('');

  const soloDigitos = numero.replace(/\D/g, '');
  const preview = soloDigitos ? `+${pais.codigo} ${soloDigitos}` : '';
  const completo = soloDigitos ? `${pais.codigo}${soloDigitos}` : '';

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-sm">
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3 bg-slate-900 text-white">
          <h2 className="font-sketch font-black text-base uppercase tracking-wide">{titulo}</h2>
          <button onClick={onOmitir}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            WhatsApp de <strong>{nombreEmpresa}</strong> para enviar el link directamente.
          </p>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Pais</label>
            <select
              value={pais.codigo}
              onChange={(e) => setPais(CODIGOS_PAIS.find((c) => c.codigo === e.target.value) ?? CODIGOS_PAIS[0])}
              className="w-full border-2 border-slate-300 px-3 h-11 text-sm font-semibold outline-none focus:border-orange-500 bg-white"
            >
              {CODIGOS_PAIS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.bandera} — {c.nombre} (+{c.codigo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
              Numero (sin 0, sin codigo de pais)
            </label>
            <div className="flex gap-2 items-center">
              <span className="border-2 border-slate-300 px-3 h-14 flex items-center font-mono font-black text-slate-700 text-sm bg-slate-50 whitespace-nowrap">
                +{pais.codigo}
              </span>
              <input
                type="tel"
                autoFocus
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="1112345678"
                className="flex-1 border-2 border-slate-300 px-4 h-14 text-xl font-mono outline-none focus:border-orange-500 text-center"
              />
            </div>
            {preview && (
              <p className="text-xs text-slate-500 mt-1.5 font-mono">
                Numero completo: <span className="font-black text-slate-800">{preview}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onOmitir}
              className="flex-1 py-2.5 border-2 border-slate-300 text-sm font-bold text-slate-600 hover:border-slate-500 transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={() => completo && onConfirm(completo)}
              disabled={!soloDigitos}
              className="flex-1 py-2.5 bg-slate-900 text-white border-2 border-slate-900 text-sm font-black uppercase tracking-wide hover:bg-slate-700 transition-colors disabled:opacity-40"
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Admin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudUpgrade[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [panelRemoto, setPanelRemoto] = useState<{ empresa: EmpresaAdmin; permiso: PermisoAcceso } | null>(null);
  const [permisos, setPermisos] = useState<Record<string, PermisoAcceso | null>>({});
  const [resultadoRemoto, setResultadoRemoto] = useState<{
    empresaNombre: string;
    link: string;
    emailEnviado: boolean;
    waAbierto: boolean;
  } | null>(null);
  const [resultadoSub, setResultadoSub] = useState<{
    empresaNombre: string;
    link: string;
    emailEnviado: boolean;
    waEnviado: boolean;
  } | null>(null);
  const [modalWa, setModalWa] = useState<{
    titulo: string;
    nombreEmpresa: string;
    mensaje: string;
    onDone: (waAbierto: boolean) => void;
  } | null>(null);

  const cargarSolicitudes = async () => {
    try {
      const s = await getSolicitudesUpgrade();
      setSolicitudes(s);
    } catch {
      // silencioso
    }
  };

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista] = await Promise.all([listarEmpresas(), cargarSolicitudes()]);
      setEmpresas(lista);
      const entries = await Promise.all(
        lista.map(async (e) => {
          try { return [e.id, await getPermisoAdmin(e.id)] as [string, PermisoAcceso | null]; }
          catch { return [e.id, null] as [string, null]; }
        })
      );
      setPermisos(Object.fromEntries(entries));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Admin] Error cargando empresas:', e);
      setError(`Error al cargar empresas: ${msg}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const toggleEstado = async (emp: EmpresaAdmin) => {
    if (toggling.has(emp.id)) return;
    const nuevo = emp.estado === 'activa' ? 'suspendida' : 'activa';
    setToggling((prev) => new Set(prev).add(emp.id));
    // Actualización optimista: la UI responde al instante.
    setEmpresas((prev) => prev.map((e) => e.id === emp.id ? { ...e, estado: nuevo } : e));
    try {
      await actualizarEmpresa(emp.id, { estado: nuevo });
    } catch {
      // Revertir si falla.
      setEmpresas((prev) => prev.map((e) => e.id === emp.id ? { ...e, estado: emp.estado } : e));
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(emp.id); return s; });
    }
  };

  const borrar = async (emp: EmpresaAdmin) => {
    if (
      !confirm(
        `¿Eliminar "${emp.nombre}" y TODOS sus datos (${emp._count.activos} activos)? Esta acción no se puede deshacer.`
      )
    )
      return;
    await eliminarEmpresa(emp.id);
    cargar();
  };

  const resetear = async (emp: EmpresaAdmin) => {
    const pass = prompt(`Nueva contraseña para el administrador de "${emp.nombre}":`);
    if (!pass) return;
    await resetPassword(emp.id, pass);
    alert('Contraseña actualizada.');
  };

  const suscribir = async (emp: EmpresaAdmin) => {
    const monto = prompt(`Monto mensual de la suscripción para "${emp.nombre}" (ARS):`);
    if (!monto) return;
    const payerEmailOverride = prompt(
      'Email del comprador para MP (dejá vacío en producción, usá email de cuenta de prueba MP en testing):'
    ) || undefined;
    try {
      const res = await generarSuscripcion(emp.id, Number(monto), payerEmailOverride);
      const initPoint = res.initPoint;
      await navigator.clipboard?.writeText(initPoint).catch(() => {});

      const mensajeWa = `Hola! Te enviamos el link para activar tu suscripción en *ActivaQR*:\n\n${initPoint}\n\nCualquier consulta estamos a disposición.`;
      const emailEnviado = !!(res as { emailEnviado?: boolean }).emailEnviado;

      setModalWa({
        titulo: 'Enviar link por WhatsApp',
        nombreEmpresa: emp.nombre,
        mensaje: mensajeWa,
        onDone: (waEnviado) => {
          setModalWa(null);
          setResultadoSub({ empresaNombre: emp.nombre, link: initPoint, emailEnviado, waEnviado });
          cargar();
        },
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo generar la suscripción.');
    }
  };

  const cancelar = async (emp: EmpresaAdmin) => {
    if (!confirm(`¿Cancelar la suscripción de "${emp.nombre}"?\nEsto la dará de baja en Mercado Pago.`)) return;
    try {
      await cancelarSuscripcion(emp.id);
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cancelar la suscripción.');
    }
  };

  const abrirAccesoRemoto = async (emp: EmpresaAdmin) => {
    const permiso = permisos[emp.id];
    if (permiso?.estado === 'activo') {
      setPanelRemoto({ empresa: emp, permiso });
      return;
    }
    // Solicitar acceso nuevo.
    const costoStr = prompt(`Costo mensual adicional del servicio de soporte para "${emp.nombre}" (ARS, dejá vacío si es sin cargo):`);
    const costo = costoStr ? Number(costoStr) : undefined;
    try {
      const { permiso: nuevo, linkAprobacion, emailEnviado } = await solicitarAccesoRemoto(emp.id, costo);
      setPermisos((prev) => ({ ...prev, [emp.id]: nuevo }));

      const msgRemoto = `Hola! Te enviamos una solicitud de acceso remoto de soporte desde *ActivaQR*.\nAprobá el acceso desde este link:\n\n${linkAprobacion}`;

      setModalWa({
        titulo: 'Enviar solicitud por WhatsApp',
        nombreEmpresa: emp.nombre,
        mensaje: msgRemoto,
        onDone: (waAbierto) => {
          setModalWa(null);
          setResultadoRemoto({ empresaNombre: emp.nombre, link: linkAprobacion, emailEnviado, waAbierto });
        },
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al solicitar acceso remoto.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Building2 size={32} /> Administración
            {solicitudes.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-black border-2 border-slate-900">
                {solicitudes.length}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{empresas.length} empresas registradas</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 font-sketch font-bold uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
        >
          <Plus size={18} /> Nueva empresa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 font-semibold">
          {error}
        </div>
      )}

      {/* Solicitudes de upgrade */}
      {solicitudes.length > 0 && (
        <div className="border-2 border-orange-400 bg-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4">
          <h2 className="font-sketch font-black text-lg uppercase tracking-tight text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-orange-500" /> Solicitudes de upgrade
            <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-black border-2 border-slate-900">
              {solicitudes.length}
            </span>
          </h2>
          <div className="space-y-3">
            {solicitudes.map((sol) => (
              <SolicitudUpgradeRow
                key={sol.id}
                solicitud={sol}
                empresas={empresas}
                onProcesar={async () => {
                  const emp = empresas.find((e) => e.id === sol.id);
                  if (emp) await suscribir(emp);
                  await descartarSolicitud(sol.id);
                  cargarSolicitudes();
                }}
                onDescartar={async () => {
                  if (!confirm(`Descartar la solicitud de upgrade de "${sol.nombre}"?`)) return;
                  await descartarSolicitud(sol.id);
                  cargarSolicitudes();
                }}
              />
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-slate-400 py-8 text-center font-sketch text-xl">Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-sketch font-black text-lg text-slate-900 leading-tight">
                    {emp.nombre}
                  </h3>
                  {emp.cuit && <p className="text-xs font-mono text-slate-500">{emp.cuit}</p>}
                </div>
                <span
                  className={`text-xs font-black uppercase px-2 py-1 border-2 ${
                    emp.estado === 'activa'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : 'bg-red-50 border-red-400 text-red-700'
                  }`}
                >
                  {emp.estado}
                </span>
              </div>

              <div className="flex gap-3 mt-3 text-xs font-mono text-slate-600">
                <span className="flex items-center gap-1">
                  <Package size={14} /> {emp._count.activos} activos
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> {emp._count.usuarios}
                </span>
                <span className="ml-auto uppercase font-black text-orange-600">{emp.plan}</span>
              </div>

              {emp.usuarios[0] && (
                <p className="text-xs text-slate-500 mt-2 font-mono truncate">
                  {emp.usuarios[0].email}
                </p>
              )}

              {emp.mpEstadoSub && (
                <p className="text-xs mt-1 font-mono text-slate-600">
                  <span className="uppercase font-black text-slate-400">Sub:</span>{' '}
                  <span
                    className={
                      emp.mpEstadoSub === 'authorized' ? 'text-emerald-600' : 'text-amber-600'
                    }
                  >
                    {emp.mpEstadoSub}
                  </span>
                  {emp.mpMonto ? ` · $${emp.mpMonto}/mes` : ''}
                </p>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t-2 border-slate-100">
                <button
                  onClick={() => toggleEstado(emp)}
                  disabled={toggling.has(emp.id)}
                  title={emp.estado === 'activa' ? 'Suspender' : 'Activar'}
                  className="flex-1 flex items-center justify-center gap-1 border-2 border-slate-300 py-2 text-xs font-bold hover:border-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Power size={14} className={toggling.has(emp.id) ? 'animate-spin' : ''} />
                  {toggling.has(emp.id) ? '...' : emp.estado === 'activa' ? 'Suspender' : 'Activar'}
                </button>
                <button
                  onClick={() => suscribir(emp)}
                  title="Generar link de suscripción (Mercado Pago)"
                  className="border-2 border-slate-300 p-2 hover:border-emerald-600 hover:text-emerald-600 transition-colors"
                >
                  <CreditCard size={14} />
                </button>
                {emp.mpPreapprovalId && emp.mpEstadoSub !== 'cancelled' && (
                  <button
                    onClick={() => cancelar(emp)}
                    title="Cancelar suscripción"
                    className="border-2 border-red-200 text-red-500 p-2 hover:border-red-600 hover:text-red-700 transition-colors"
                  >
                    <XCircle size={14} />
                  </button>
                )}
                <button
                  onClick={() => resetear(emp)}
                  title="Resetear contraseña"
                  className="border-2 border-slate-300 p-2 hover:border-slate-900 transition-colors"
                >
                  <KeyRound size={14} />
                </button>
                {(['empresa', 'industrial'].includes(emp.plan) || permisos[emp.id] != null) && (
                  <button
                    onClick={() => abrirAccesoRemoto(emp)}
                    title={permisos[emp.id]?.estado === 'activo' ? 'Abrir panel remoto' : 'Solicitar acceso remoto'}
                    className={`border-2 p-2 transition-colors ${
                      permisos[emp.id]?.estado === 'activo'
                        ? 'border-emerald-400 text-emerald-600 hover:border-emerald-600'
                        : permisos[emp.id]?.estado === 'pendiente'
                          ? 'border-amber-400 text-amber-600 hover:border-amber-600'
                          : 'border-slate-300 hover:border-orange-500 hover:text-orange-600'
                    }`}
                  >
                    <MonitorSmartphone size={14} />
                  </button>
                )}
                <button
                  onClick={() => borrar(emp)}
                  title="Eliminar"
                  className="border-2 border-red-300 text-red-600 p-2 hover:border-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNuevaEmpresa
          onClose={() => setModalAbierto(false)}
          onCreada={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}

      {panelRemoto && (
        <PanelAccesoRemoto
          empresaId={panelRemoto.empresa.id}
          empresaNombre={panelRemoto.empresa.nombre}
          permiso={panelRemoto.permiso}
          onClose={() => setPanelRemoto(null)}
        />
      )}

      {resultadoRemoto && (
        <ModalResultadoRemoto
          empresaNombre={resultadoRemoto.empresaNombre}
          link={resultadoRemoto.link}
          emailEnviado={resultadoRemoto.emailEnviado}
          waAbierto={resultadoRemoto.waAbierto}
          onClose={() => setResultadoRemoto(null)}
        />
      )}

      {resultadoSub && (
        <ModalResultadoSuscripcion
          empresaNombre={resultadoSub.empresaNombre}
          link={resultadoSub.link}
          emailEnviado={resultadoSub.emailEnviado}
          waEnviado={resultadoSub.waEnviado}
          onClose={() => setResultadoSub(null)}
        />
      )}

      {modalWa && (
        <ModalWhatsapp
          titulo={modalWa.titulo}
          nombreEmpresa={modalWa.nombreEmpresa}
          onConfirm={(numero) => {
            window.open(
              `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(modalWa.mensaje)}`,
              '_blank'
            );
            modalWa.onDone(true);
          }}
          onOmitir={() => modalWa.onDone(false)}
        />
      )}
    </div>
  );
};

const ModalNuevaEmpresa: React.FC<{ onClose: () => void; onCreada: () => void }> = ({
  onClose,
  onCreada,
}) => {
  const [form, setForm] = useState({
    nombre: '',
    cuit: '',
    plan: 'inicial',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearEmpresa(form);
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la empresa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-md my-8">
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3">
          <h2 className="font-sketch font-black text-xl uppercase">Nueva empresa</h2>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Campo label="Nombre de la empresa *">
            <input
              required
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className="campo"
            />
          </Campo>
          <Campo label="CUIT">
            <input value={form.cuit} onChange={(e) => set('cuit', e.target.value)} className="campo" />
          </Campo>
          <Campo label="Plan">
            <select value={form.plan} onChange={(e) => set('plan', e.target.value)} className="campo">
              {PLANES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>

          <div className="pt-2 border-t-2 border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2">
              Usuario administrador de la empresa
            </p>
            <Campo label="Nombre">
              <input
                value={form.adminNombre}
                onChange={(e) => set('adminNombre', e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo label="Email *">
              <input
                required
                type="email"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                className="campo font-mono"
              />
            </Campo>
            <Campo label="Contraseña *">
              <input
                required
                value={form.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
                className="campo font-mono"
              />
            </Campo>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm px-3 py-2 font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-orange-500 text-white h-11 font-sketch font-black uppercase border-2 border-slate-900 shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear empresa'}
          </button>
        </form>
      </div>

      <style>{`
        .campo {
          width: 100%;
          border: 2px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .campo:focus { border-color: #f97316; }
      `}</style>
    </div>
  );
};

const ModalResultadoSuscripcion: React.FC<{
  empresaNombre: string;
  link: string;
  emailEnviado: boolean;
  waEnviado: boolean;
  onClose: () => void;
}> = ({ empresaNombre, link, emailEnviado, waEnviado, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-md">
      <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3 bg-slate-900 text-white">
        <h2 className="font-sketch font-black text-lg uppercase tracking-wide flex items-center gap-2">
          <CreditCard size={18} /> Link generado
        </h2>
        <button onClick={onClose}><X size={20} /></button>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-700">
          El link de suscripción para <strong>{empresaNombre}</strong> fue generado y copiado al portapapeles.
        </p>

        {/* Estado de envíos */}
        <div className="border-2 border-slate-200 divide-y-2 divide-slate-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-5 h-5 flex items-center justify-center text-xs font-black border-2 ${waEnviado ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-100 border-slate-300 text-slate-400'}`}>
              {waEnviado ? '✓' : '–'}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              WhatsApp Web {waEnviado ? 'abierto con mensaje listo' : 'no enviado'}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-5 h-5 flex items-center justify-center text-xs font-black border-2 ${emailEnviado ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-600'}`}>
              {emailEnviado ? '✓' : '!'}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {emailEnviado
                ? 'Email enviado automáticamente'
                : 'Email no enviado (RESEND_API_KEY no configurada)'}
            </span>
          </div>
        </div>

        {/* Link copiable */}
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Link de pago</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 border-2 border-slate-300 px-3 py-2 text-xs font-mono truncate outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => navigator.clipboard?.writeText(link)}
              className="border-2 border-slate-900 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-500 text-white border-2 border-slate-900 font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ModalResultadoRemoto: React.FC<{
  empresaNombre: string;
  link: string;
  emailEnviado: boolean;
  waAbierto: boolean;
  onClose: () => void;
}> = ({ empresaNombre, link, emailEnviado, waAbierto, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-md">
      <div className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-3 bg-slate-900 text-white">
        <h2 className="font-sketch font-black text-lg uppercase tracking-wide flex items-center gap-2">
          <MonitorSmartphone size={18} /> Solicitud enviada
        </h2>
        <button onClick={onClose}><X size={20} /></button>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-700">
          Se generó la solicitud de acceso remoto para <strong>{empresaNombre}</strong>.
          El cliente debe aprobar el acceso desde el link que le enviaste.
        </p>

        <div className="border-2 border-slate-200 divide-y-2 divide-slate-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-5 h-5 flex items-center justify-center text-xs font-black border-2 ${waAbierto ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-600'}`}>
              {waAbierto ? '✓' : '!'}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {waAbierto
                ? 'WhatsApp Web abierto con mensaje listo'
                : 'WhatsApp bloqueado por el navegador — copiá el link manualmente'}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-5 h-5 flex items-center justify-center text-xs font-black border-2 ${emailEnviado ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-600'}`}>
              {emailEnviado ? '✓' : '!'}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {emailEnviado
                ? 'Email de aprobación enviado automáticamente'
                : 'Email no enviado (RESEND_API_KEY no configurada)'}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Link de aprobación para el cliente</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 border-2 border-slate-300 px-3 py-2 text-xs font-mono truncate outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => navigator.clipboard?.writeText(link)}
              className="border-2 border-slate-900 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>

        {!waAbierto && (
          <div className="bg-amber-50 border-2 border-amber-300 px-3 py-2 text-xs text-amber-800 font-semibold">
            El navegador bloqueó la ventana de WhatsApp. Copiá el link de arriba y envialo manualmente.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-500 text-white border-2 border-slate-900 font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  </div>
);

const PLAN_LABEL: Record<string, string> = { inicial: 'Inicial', empresa: 'Empresa', industrial: 'Industrial' };

const SolicitudUpgradeRow: React.FC<{
  solicitud: SolicitudUpgrade;
  empresas: EmpresaAdmin[];
  onProcesar: () => Promise<void>;
  onDescartar: () => Promise<void>;
}> = ({ solicitud, onProcesar, onDescartar }) => {
  const [procesando, setProcesando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="min-w-0">
        <p className="font-sketch font-black text-slate-900 text-base leading-tight">{solicitud.nombre}</p>
        {solicitud.adminEmail && (
          <p className="text-xs font-mono text-slate-500 mt-0.5">{solicitud.adminEmail}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-black uppercase px-2 py-0.5 border-2 border-slate-300 text-slate-600">
            {PLAN_LABEL[solicitud.plan] ?? solicitud.plan}
          </span>
          <ArrowRight size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-xs font-black uppercase px-2 py-0.5 border-2 border-orange-400 bg-orange-50 text-orange-700">
            {PLAN_LABEL[solicitud.planSolicitado] ?? solicitud.planSolicitado}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={async () => { setProcesando(true); try { await onProcesar(); } finally { setProcesando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 bg-orange-500 text-white border-2 border-slate-900 font-black uppercase text-xs shadow-[2px_2px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
        >
          {procesando ? '...' : 'Procesar'}
        </button>
        <button
          onClick={async () => { setDescartando(true); try { await onDescartar(); } finally { setDescartando(false); } }}
          disabled={procesando || descartando}
          className="px-4 py-2 border-2 border-red-300 text-red-600 font-bold text-xs hover:border-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {descartando ? '...' : 'Descartar'}
        </button>
      </div>
    </div>
  );
};

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
      {label}
    </label>
    {children}
  </div>
);

