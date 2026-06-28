// v1.1.0
import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button, Card } from '../components/ui';

export const GestionQR: React.FC = () => {
  const { activos, getSectorNombre } = useActivos();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintOne = (activoId: string) => {
    // La ficha publica: cualquiera puede identificar el equipo sin cuenta.
    const url = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activoId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">QR / Etiquetas</h1>
          <p className="text-muted text-sm mt-1">{activos.length} activos</p>
        </div>
        <Button
          type="button"
          onClick={handlePrintAll}
          iconLeft={<Printer size={16} />}
        >
          Imprimir Todas
        </Button>
      </div>

      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:grid-cols-4">
        {activos.map((activo) => {
          const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activo.id}`;
          return (
            <Card
              key={activo.id}
              padding="sm"
              className="text-center print:shadow-none print:border print:break-inside-avoid"
            >
              {/* QR Code */}
              <div className="inline-block border border-line rounded-md p-2 mb-2 bg-white">
                <QRCodeSVG value={qrValue} size={100} />
              </div>

              {/* Info */}
              <div className="font-mono font-bold text-xs text-content leading-tight">{activo.codigo}</div>
              <div className="text-xs text-muted mt-0.5 leading-snug truncate">{activo.nombre}</div>
              <div className="text-xs text-faint mt-0.5">{getSectorNombre(activo.sectorId)}</div>

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
                className="press mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold border border-line rounded-md py-1.5 text-muted hover:border-line-strong hover:text-content transition-colors print:hidden"
              >
                <Download size={11} />
                Imprimir
              </button>
            </Card>
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
