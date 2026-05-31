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
  X,
} from 'lucide-react';
import {
  EmpresaAdmin,
  listarEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  resetPassword,
  generarSuscripcion,
  cancelarSuscripcion,
} from '../data/adminApi';

const PLANES = ['inicial', 'empresa', 'industrial'] as const;

export const Admin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultadoSub, setResultadoSub] = useState<{
    empresaNombre: string;
    link: string;
    emailEnviado: boolean;
    waEnviado: boolean;
  } | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setEmpresas(await listarEmpresas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar empresas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const toggleEstado = async (emp: EmpresaAdmin) => {
    const nuevo = emp.estado === 'activa' ? 'suspendida' : 'activa';
    await actualizarEmpresa(emp.id, { estado: nuevo });
    cargar();
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

      // WhatsApp Web con el link pre-cargado
      const telefonoRaw = prompt(
        `Número de WhatsApp de "${emp.nombre}" para enviar el link (ej: 5491112345678).\nDejá vacío para omitir WhatsApp:`,
        (emp as EmpresaAdmin & { telefono?: string }).telefono ?? ''
      );
      let waEnviado = false;
      if (telefonoRaw && telefonoRaw.trim()) {
        const numero = telefonoRaw.trim().replace(/\D/g, '');
        const mensaje = `Hola! Te enviamos el link para activar tu suscripción en *ActivaQR*:\n\n${initPoint}\n\nCualquier consulta estamos a disposición.`;
        window.open(`https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`, '_blank');
        waEnviado = true;
      }

      setResultadoSub({
        empresaNombre: emp.nombre,
        link: initPoint,
        emailEnviado: !!(res as { emailEnviado?: boolean }).emailEnviado,
        waEnviado,
      });

      cargar();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Building2 size={32} /> Administración
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
                  title={emp.estado === 'activa' ? 'Suspender' : 'Activar'}
                  className="flex-1 flex items-center justify-center gap-1 border-2 border-slate-300 py-2 text-xs font-bold hover:border-slate-900 transition-colors"
                >
                  <Power size={14} />
                  {emp.estado === 'activa' ? 'Suspender' : 'Activar'}
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

      {resultadoSub && (
        <ModalResultadoSuscripcion
          empresaNombre={resultadoSub.empresaNombre}
          link={resultadoSub.link}
          emailEnviado={resultadoSub.emailEnviado}
          waEnviado={resultadoSub.waEnviado}
          onClose={() => setResultadoSub(null)}
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

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
      {label}
    </label>
    {children}
  </div>
);

