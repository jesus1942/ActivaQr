import { Activo, Medicion } from '../data/types';

export function resumenMantenimiento(activo: Activo, mediciones: Medicion[] = []) {
  const estrategia = activo.estrategiaMantenimiento ?? (
    activo.proximoMantenimiento ? 'fecha' : 'horas'
  );
  if (estrategia === 'fecha') {
    if (!activo.proximoMantenimiento) return null;
    const fecha = new Date(activo.proximoMantenimiento);
    const dias = Math.ceil((fecha.getTime() - Date.now()) / 86_400_000);
    return {
      estrategia,
      principal: fecha.toLocaleDateString('es-AR'),
      detalle: dias < 0 ? `Vencido hace ${Math.abs(dias)} día(s)` : `Faltan ${dias} día(s)`,
      vencido: dias <= 0,
    };
  }

  const actual = estrategia === 'kilometros'
    ? activo.kilometrosActuales ?? 0
    : activo.horasActuales ?? 0;
  const proximo = activo.proximoMantenimientoLectura;
  if (proximo == null) return null;
  const unidad = estrategia === 'kilometros' ? 'km' : 'h';
  const restante = proximo - actual;

  const lecturas = mediciones
    .map((medicion) => ({
      fecha: new Date(medicion.fecha).getTime(),
      valor: estrategia === 'kilometros' ? medicion.kilometraje : medicion.horasMarcha,
    }))
    .filter((item): item is { fecha: number; valor: number } => (
      Number.isFinite(item.fecha) && typeof item.valor === 'number' && item.valor >= 0
    ))
    .sort((a, b) => a.fecha - b.fecha);

  let estimacion = '';
  if (restante > 0 && lecturas.length >= 2) {
    const primera = lecturas[0];
    const ultima = lecturas[lecturas.length - 1];
    const dias = (ultima.fecha - primera.fecha) / 86_400_000;
    const usoPorDia = dias > 0 ? (ultima.valor - primera.valor) / dias : 0;
    if (usoPorDia > 0) {
      const diasRestantes = Math.ceil(restante / usoPorDia);
      const fechaEstimada = new Date(Date.now() + diasRestantes * 86_400_000);
      estimacion = ` · estimado ${fechaEstimada.toLocaleDateString('es-AR')}`;
    }
  }

  return {
    estrategia,
    principal: `${proximo.toLocaleString('es-AR')} ${unidad}`,
    detalle: restante <= 0
      ? `Vencido por ${Math.abs(restante).toLocaleString('es-AR')} ${unidad}`
      : `Faltan ${restante.toLocaleString('es-AR')} ${unidad}${estimacion}`,
    vencido: restante <= 0,
  };
}

export function siguienteCicloLocal(activo: Activo, fechaRealizada: string): Partial<Activo> | null {
  const intervalo = Number(activo.intervaloMantenimiento);
  if (!Number.isFinite(intervalo) || intervalo <= 0) return null;
  const base = new Date(`${fechaRealizada.slice(0, 10)}T12:00:00`);
  const comun = { ultimaFechaMantenimiento: fechaRealizada.slice(0, 10) };
  if (activo.estrategiaMantenimiento === 'horas') {
    return {
      ...comun,
      proximoMantenimientoLectura: (activo.horasActuales ?? 0) + Math.round(intervalo),
    };
  }
  if (activo.estrategiaMantenimiento === 'kilometros') {
    return {
      ...comun,
      proximoMantenimientoLectura: (activo.kilometrosActuales ?? 0) + Math.round(intervalo),
    };
  }
  if (activo.unidadMantenimiento === 'dias') base.setDate(base.getDate() + intervalo);
  else if (activo.unidadMantenimiento === 'semanas') base.setDate(base.getDate() + intervalo * 7);
  else base.setMonth(base.getMonth() + intervalo);
  return {
    ...comun,
    proximoMantenimiento: base.toISOString().slice(0, 10),
  };
}
