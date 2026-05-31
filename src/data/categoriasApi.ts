import { apiFetch } from './auth';

export interface ParametroCategoria {
  id: string;
  categoriaId: string;
  clave: string;
  nombre: string;
  unidad?: string;
  tipo: 'numerico' | 'porcentaje' | 'booleano' | 'texto' | 'seleccion';
  obligatorio: boolean;
  orden: number;
  minNormal?: number | null;
  maxNormal?: number | null;
  umbralAlerta?: number | null;
  umbralCritico?: number | null;
  umbralUrgente?: number | null;
  invertido: boolean;
}

export interface CategoriaEquipo {
  id: string;
  nombre: string;
  icono?: string | null;
  descripcion?: string | null;
  orden: number;
  empresaId: string | null;
  parametros: ParametroCategoria[];
}

export async function getCategorias(): Promise<CategoriaEquipo[]> {
  const res = await apiFetch('api/categorias');
  if (!res.ok) throw new Error('Error al cargar categorías');
  return res.json();
}

export async function getCategoria(id: string): Promise<CategoriaEquipo> {
  const res = await apiFetch(`api/categorias/${id}`);
  if (!res.ok) throw new Error('Categoría no encontrada');
  return res.json();
}

export async function crearCategoria(data: Partial<CategoriaEquipo>): Promise<CategoriaEquipo> {
  const res = await apiFetch('api/categorias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Error al crear categoría');
  }
  return res.json();
}

export async function eliminarCategoria(id: string): Promise<void> {
  const res = await apiFetch(`api/categorias/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Error al eliminar categoría');
  }
}

export async function agregarParametro(
  categoriaId: string,
  data: Partial<ParametroCategoria>
): Promise<ParametroCategoria> {
  const res = await apiFetch(`api/categorias/${categoriaId}/parametros`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Error al agregar parámetro');
  }
  return res.json();
}
