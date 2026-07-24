// Imprime una etiqueta autocontenida (solo QR + codigo + nombre) desde la
// pagina actual. No usa popups ni iframes: ambos mecanismos son bloqueados
// por algunos navegadores moviles y por las PWA instaladas.
//
// Etiqueta dimensionada para:
// - Etiquetadoras Brother QL (62mm o 29mm continuo, DK precortado).
// - Impresoras laser A4 (la etiqueta queda chica centrada, recortable).
//   Cuando llegue la Brother, ajustamos anchoMm/altoMm al rollo exacto.

export interface ImprimirEtiquetaOpts {
  codigo: string;
  nombre: string;
  qrSvgString: string;
  qrViewBox?: string;
  empresaNombre?: string;
  anchoMm?: number;
  altoMm?: number;
}

const PRINT_ROOT_ID = 'activaqr-print-label';
const PRINT_STYLE_ID = 'activaqr-print-label-styles';

export function imprimirEtiquetaQR({
  codigo,
  nombre,
  qrSvgString,
  qrViewBox = '0 0 29 29',
  empresaNombre,
  anchoMm = 50,
  altoMm = 50,
}: ImprimirEtiquetaOpts): void {
  limpiarImpresionAnterior();

  const etiqueta = document.createElement('section');
  etiqueta.id = PRINT_ROOT_ID;
  etiqueta.setAttribute('aria-label', `Etiqueta ${codigo}`);
  etiqueta.innerHTML = crearEtiquetaSvg({
    codigo,
    nombre,
    qrSvgString,
    qrViewBox,
    empresaNombre,
    anchoMm,
    altoMm,
  });

  const estilos = document.createElement('style');
  estilos.id = PRINT_STYLE_ID;
  estilos.textContent = `
    #${PRINT_ROOT_ID} { display: none; }
    @page { size: ${anchoMm}mm ${altoMm}mm; margin: 0; }
    @media print {
      html, body {
        width: ${anchoMm}mm !important;
        height: ${altoMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
      }
      body > * { display: none !important; }
      body > #${PRINT_ROOT_ID} {
        display: block !important;
        position: absolute !important;
        inset: 0 !important;
        width: ${anchoMm}mm !important;
        height: ${altoMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      #${PRINT_ROOT_ID} > svg {
        display: block !important;
        width: ${anchoMm}mm !important;
        height: ${altoMm}mm !important;
      }
    }
  `;

  document.head.appendChild(estilos);
  document.body.appendChild(etiqueta);

  const limpiar = () => {
    window.removeEventListener('afterprint', limpiar);
    etiqueta.remove();
    estilos.remove();
  };

  window.addEventListener('afterprint', limpiar, { once: true });

  try {
    window.focus();
    window.print();
  } catch (error) {
    console.error('[imprimirEtiqueta] print error:', error);
    limpiar();
    descargarEtiquetaQR({
      codigo,
      nombre,
      qrSvgString,
      qrViewBox,
      empresaNombre,
      anchoMm,
      altoMm,
    });
    window.alert('El navegador no abrió la impresión. Descargamos la etiqueta en SVG para que puedas abrirla e imprimirla.');
    return;
  }

  // Algunos navegadores moviles no emiten afterprint. El nodo es invisible
  // fuera del modo impresion y se elimina luego como respaldo.
  window.setTimeout(limpiar, 5 * 60 * 1000);
}

export function descargarEtiquetaQR({
  codigo,
  nombre,
  qrSvgString,
  qrViewBox = '0 0 29 29',
  empresaNombre,
  anchoMm = 50,
  altoMm = 50,
}: ImprimirEtiquetaOpts): void {
  const svg = crearEtiquetaSvg({
    codigo,
    nombre,
    qrSvgString,
    qrViewBox,
    empresaNombre,
    anchoMm,
    altoMm,
  });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `ActivaQR-Etiqueta-${slugArchivo(codigo)}.svg`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crearEtiquetaSvg({
  codigo,
  nombre,
  qrSvgString,
  qrViewBox = '0 0 29 29',
  empresaNombre,
  anchoMm = 50,
  altoMm = 50,
}: ImprimirEtiquetaOpts): string {
  const ancho = anchoMm * 10;
  const alto = altoMm * 10;
  const margen = Math.max(16, Math.round(Math.min(ancho, alto) * 0.04));
  const altoTexto = Math.max(118, Math.round(alto * 0.25));
  const ladoQr = Math.max(80, Math.min(ancho - margen * 2, alto - altoTexto - margen));
  const xQr = (ancho - ladoQr) / 2;
  const yCodigo = alto - altoTexto + 36;
  const yNombre = yCodigo + 32;
  const yEmpresa = yNombre + 25;
  const nombreFontSize = Math.max(
    14,
    Math.min(22, Math.floor((ancho - margen * 2) / Math.max(nombre.length * 0.62, 1))),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${anchoMm}mm" height="${altoMm}mm" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Etiqueta ${escapeHtml(codigo)}">
  <rect width="${ancho}" height="${alto}" fill="#fff"/>
  <svg x="${xQr}" y="${margen}" width="${ladoQr}" height="${ladoQr}" viewBox="${escapeHtml(qrViewBox)}">${qrSvgString}</svg>
  <text x="${ancho / 2}" y="${yCodigo}" text-anchor="middle" fill="#000" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="30" font-weight="900" letter-spacing="2">${escapeHtml(codigo)}</text>
  <text x="${ancho / 2}" y="${yNombre}" text-anchor="middle" fill="#000" font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" font-size="${nombreFontSize}" font-weight="600">${escapeHtml(nombre)}</text>
  <text x="${ancho / 2}" y="${yEmpresa}" text-anchor="middle" fill="#777" font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" font-size="16">${escapeHtml(empresaNombre ?? 'ActivaQR')}</text>
</svg>`;
}

function limpiarImpresionAnterior(): void {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
}

function slugArchivo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'activo';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
