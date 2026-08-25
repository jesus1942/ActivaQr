import type { TareaMantenimiento } from '../data/types';

/**
 * Devuelve el estado operativo real de una tarea.
 *
 * El backend conserva el estado persistido, pero una tarea pendiente pasa a
 * estar vencida automáticamente cuando su fecha programada quedó antes de hoy.
 * Centralizar esta regla evita que Dashboard, Mantenimiento e Indicadores
 * muestren resultados contradictorios.
 */
export function estadoEfectivoTarea(
  tarea: Pick<TareaMantenimiento, 'estado' | 'fechaProgramada'>,
  ahora = new Date(),
): TareaMantenimiento['estado'] {
  if (tarea.estado === 'completado') return 'completado';

  // Una fecha calendario (YYYY-MM-DD) no representa un instante UTC. Parsearla
  // con `new Date(texto)` puede convertir "hoy" en "ayer" según la zona horaria.
  const dateOnly = tarea.fechaProgramada.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const fecha = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(tarea.fechaProgramada);
  if (Number.isNaN(fecha.getTime())) return tarea.estado;

  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  return fecha.getTime() < inicioHoy.getTime() ? 'vencido' : 'pendiente';
}

/** Crea una vista consistente sin modificar el objeto almacenado. */
export function tareaConEstadoEfectivo(tarea: TareaMantenimiento, ahora = new Date()): TareaMantenimiento {
  return { ...tarea, estado: estadoEfectivoTarea(tarea, ahora) };
}
