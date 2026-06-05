// Imprime una etiqueta autocontenida (solo QR + codigo + nombre) en una
// ventana nueva, sin tocar el resto de la pagina. Pensado para:
//
// - Etiquetadoras Brother QL (62mm o 29mm continuo, o DK precortado).
// - Impresoras laser A4 (la etiqueta queda chica centrada, podes
//   recortar y pegar o configurar la impresora con tamaño custom).
//
// Por que ventana nueva en vez de @media print global: porque @media print
// que oculte 80% del DOM es fragil — un componente nuevo en la pagina sin
// "hide-on-print" rompe la etiqueta. Window-isolated es bulletproof.

interface ImprimirEtiquetaOpts {
  codigo: string;
  nombre: string;
  qrSvgString: string; // SVG serializado del QR (innerHTML del <svg>)
  qrViewBox?: string;  // ej "0 0 29 29"
  empresaNombre?: string;
  // Tamaño de la etiqueta. Default 50x50mm — anda bien en Brother 62mm
  // y en laser A4. Se puede sobrescribir si Jesus quiere otro formato.
  anchoMm?: number;
  altoMm?: number;
}

export function imprimirEtiquetaQR({
  codigo,
  nombre,
  qrSvgString,
  qrViewBox = '0 0 29 29',
  empresaNombre,
  anchoMm = 50,
  altoMm = 50,
}: ImprimirEtiquetaOpts): void {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiqueta ${codigo}</title>
<style>
  @page { size: ${anchoMm}mm ${altoMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; }
  body {
    width: ${anchoMm}mm;
    height: ${altoMm}mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 2mm;
    font-family: system-ui, -apple-system, Helvetica, Arial, sans-serif;
    color: #000;
  }
  .qr { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; }
  .qr svg { width: 100%; height: auto; max-height: ${altoMm - 16}mm; }
  .codigo { font-size: 3mm; font-weight: 900; letter-spacing: 0.5mm; font-family: ui-monospace, Menlo, Consolas, monospace; margin-top: 1mm; text-align: center; }
  .nombre { font-size: 2.4mm; font-weight: 600; text-align: center; line-height: 1.1; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pie   { font-size: 1.8mm; opacity: 0.55; text-align: center; }
  @media screen {
    body { box-shadow: 0 0 0 1px #ccc; margin: 2mm auto; }
  }
</style>
</head>
<body>
  <div class="qr"><svg viewBox="${qrViewBox}" xmlns="http://www.w3.org/2000/svg">${qrSvgString}</svg></div>
  <div class="codigo">${escape(codigo)}</div>
  <div class="nombre">${escape(nombre)}</div>
  <div class="pie">${escape(empresaNombre ?? 'ActivaQR')}</div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 100);
    });
    window.addEventListener('afterprint', function() { window.close(); });
  </script>
</body>
</html>`;

  // En iOS Safari window.open requiere ser disparado en el handler de un
  // click — por eso esta funcion DEBE invocarse directo desde el onClick,
  // no detras de un await.
  const win = window.open('', '_blank', 'width=420,height=520');
  if (!win) {
    alert('El navegador bloqueo la ventana de impresion. Habilitala en la configuracion del navegador y reintenta.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
