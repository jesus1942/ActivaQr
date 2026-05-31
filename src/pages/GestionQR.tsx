// v1.1.0
import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';

export const GestionQR: React.FC = () => {
  const { activos, getSectorNombre } = useActivos();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintOne = (activoId: string) => {
    // Set a query param or use a print-specific approach
    const url = `${window.location.origin}${import.meta.env.BASE_URL}#/medicion/${activoId}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">QR / Etiquetas</h1>
          <p className="text-slate-500 text-sm mt-1">{activos.length} activos</p>
        </div>
        <button
          onClick={handlePrintAll}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:bg-slate-700 transition-colors"
        >
          <Printer size={16} />
          Imprimir Todas
        </button>
      </div>

      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-4">
        {activos.map((activo) => {
          const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/medicion/${activo.id}`;
          return (
            <div
              key={activo.id}
              className="bg-white border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] p-3 text-center print:shadow-none print:border print:break-inside-avoid"
            >
              {/* QR Code */}
              <div className="inline-block border-2 border-slate-200 p-2 mb-2">
                <QRCodeSVG value={qrValue} size={100} />
              </div>

              {/* Info */}
              <div className="font-mono font-black text-xs text-slate-900 leading-tight">{activo.codigo}</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-snug truncate">{activo.nombre}</div>
              <div className="text-xs text-slate-400 mt-0.5">{getSectorNombre(activo.sectorId)}</div>

              <div className="mt-2">
                <StatusBadge estado={activo.estado} size="sm" />
              </div>

              {/* Print button */}
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html><head><title>Etiqueta ${activo.codigo}</title>
                      <style>
                        body { font-family: monospace; padding: 20px; text-align: center; }
                        .label { border: 2px solid #000; padding: 15px; display: inline-block; width: 250px; }
                        .code { font-size: 16px; font-weight: bold; }
                        .name { font-size: 12px; color: #555; }
                        .sector { font-size: 11px; color: #888; }
                        img { display: block; margin: 10px auto; }
                      </style></head>
                      <body>
                        <div class="label">
                          <div class="code">${activo.codigo}</div>
                          <div class="name">${activo.nombre}</div>
                          <div class="sector">${getSectorNombre(activo.sectorId)}</div>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrValue)}" width="120" height="120" />
                          <div style="font-size:9px; color:#aaa; word-break:break-all;">${qrValue}</div>
                        </div>
                        <script>window.onload = function() { window.print(); }<\/script>
                      </body></html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-bold border-2 border-slate-300 py-1 hover:border-orange-500 hover:text-orange-600 transition-colors print:hidden"
              >
                <Download size={11} />
                Imprimir
              </button>
            </div>
          );
        })}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #root > * { display: none !important; }
          .print\\:grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  );
};
