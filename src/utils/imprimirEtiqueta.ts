// Imprime una etiqueta autocontenida (solo QR + codigo + nombre) en un
// IFRAME oculto en la misma pagina. Por que iframe y no window.open:
// iOS Safari bloquea agresivamente window.open() y muchos usuarios
// reportaban "no imprime nada". El iframe NO requiere permiso de popup,
// vive escondido, dispara print(), y se autodestruye despues.
//
// Etiqueta dimensionada para:
// - Etiquetadoras Brother QL (62mm o 29mm continuo, DK precortado).
// - Impresoras laser A4 (la etiqueta queda chica centrada, recortable).
//   Cuando llegue la Brother, ajustamos anchoMm/altoMm al rollo exacto.

interface ImprimirEtiquetaOpts {
  codigo: string;
  nombre: string;
  qrSvgString: string;
  qrViewBox?: string;
  empresaNombre?: string;
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
<title>Etiqueta ${escapeHtml(codigo)}</title>
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
</style>
</head>
<body>
  <div class="qr"><svg viewBox="${qrViewBox}" xmlns="http://www.w3.org/2000/svg">${qrSvgString}</svg></div>
  <div class="codigo">${escapeHtml(codigo)}</div>
  <div class="nombre">${escapeHtml(nombre)}</div>
  <div class="pie">${escapeHtml(empresaNombre ?? 'ActivaQR')}</div>
</body>
</html>`;

  // Crear iframe escondido FUERA del flujo de scroll/render. Tamaño 0,
  // posicion fixed para no mover layout, opacity 0 por las dudas.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const limpiar = () => {
    // Damos tiempo a que el dialog de impresion termine antes de quitar
    // el iframe — en algunos navegadores quitarlo antes cancela el job.
    setTimeout(() => {
      try { iframe.remove(); } catch { /* noop */ }
    }, 500);
  };

  // Cargar el HTML al iframe via srcdoc (mejor compat que document.write,
  // funciona en iOS y respeta el sandbox por defecto).
  iframe.srcdoc = html;

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) {
        alert('No se pudo preparar la etiqueta para imprimir. Probá de nuevo.');
        limpiar();
        return;
      }
      // Pequeño delay para que las fonts/styles se apliquen antes de print.
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (e) {
          console.error('[imprimirEtiqueta] print error:', e);
          alert('No se pudo abrir el dialogo de impresion. Si estas en iPhone, podes tocar Compartir → Imprimir desde la ficha.');
        }
        // En la mayoria de navegadores afterprint se dispara aca; igual
        // limpiamos a los 500ms por las dudas.
        win.addEventListener('afterprint', limpiar);
        setTimeout(limpiar, 60000);
      }, 100);
    } catch (e) {
      console.error('[imprimirEtiqueta] onload error:', e);
      limpiar();
    }
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
