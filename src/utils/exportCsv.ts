export function exportarCsv(nombre: string, filas: Record<string, unknown>[]) {
  if (!filas.length) return;
  const cabecera = Object.keys(filas[0]);
  const escapar = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv =
    '﻿' +
    [cabecera, ...filas.map((f) => cabecera.map((k) => escapar(f[k])))].map((r) => r.join(',')).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
