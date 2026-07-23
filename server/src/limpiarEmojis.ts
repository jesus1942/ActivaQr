/**
 * Limpieza one-time de emojis en categorias guardadas en BD.
 *
 * Razon: la app tiene regla "cero emojis" pero hay categorias historicas
 * (algunas globales del seed viejo, otras creadas por tenants) que se cargaron
 * con emojis en el nombre, icono o descripcion. Esto recorre todas las
 * categorias al startup y les saca cualquier caracter en rango de emoji.
 *
 * Idempotente y barato: si no hay nada para limpiar, no escribe nada.
 */
import { prisma } from './prisma';

// Cubre los principales bloques Unicode de emojis: emoticons, simbolos, transporte,
// banderas, sombreros, etc. Excluye box-drawing (los `─` de separadores).
const RANGO_EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

function limpiar(texto: string | null | undefined): string | null {
  if (!texto) return texto ?? null;
  const limpio = texto.replace(RANGO_EMOJI, '').replace(/\s+/g, ' ').trim();
  return limpio.length > 0 ? limpio : null;
}

export async function limpiarEmojisDeCategorias() {
  const cats = await prisma.categoriaEquipo.findMany({
    select: { id: true, nombre: true, icono: true, descripcion: true },
  });

  let nombreLimpiados = 0;
  let iconoLimpiados = 0;
  let descripcionLimpiados = 0;

  for (const c of cats) {
    const nombre = limpiar(c.nombre);
    const icono = limpiar(c.icono);
    const descripcion = limpiar(c.descripcion);

    const cambios: { nombre?: string; icono?: string | null; descripcion?: string | null } = {};
    if (nombre && nombre !== c.nombre) { cambios.nombre = nombre; nombreLimpiados++; }
    if (icono !== c.icono) { cambios.icono = icono; iconoLimpiados++; }
    if (descripcion !== c.descripcion) { cambios.descripcion = descripcion; descripcionLimpiados++; }

    if (Object.keys(cambios).length === 0) continue;

    await prisma.categoriaEquipo.update({
      where: { id: c.id },
      data: cambios,
    });
  }

  if (nombreLimpiados + iconoLimpiados + descripcionLimpiados > 0) {
    console.log(
      `limpiarEmojisDeCategorias: ${nombreLimpiados} nombres, ${iconoLimpiados} iconos, ${descripcionLimpiados} descripciones limpiadas`
    );
  }
}

if (require.main === module) {
  limpiarEmojisDeCategorias()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
