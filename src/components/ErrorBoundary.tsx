import React from 'react';
import { AlertTriangle, RotateCw, Home, LogOut, Copy, Check } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** 'full' bloquea toda la pantalla; 'inline' deja la navegacion accesible. */
  variant?: 'full' | 'inline';
  /** Etiqueta de la seccion donde ocurrio (p.ej. "Configuracion"). */
  scope?: string;
  /** Reset key: cuando cambia, el boundary se rearma. Util para resetear al cambiar de ruta. */
  resetKey?: string | number;
  /** Callback opcional para volver atras (lo usa la variante inline). */
  onVolver?: () => void;
}

interface State {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copiado: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, errorInfo: null, copiado: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', this.props.scope ?? 'app', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, errorInfo: null, copiado: false });
    }
  }

  copiarError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;
    const texto = [
      `[ActivaQR error report]`,
      `Seccion: ${this.props.scope ?? '(global)'}`,
      `Fecha: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      ``,
      `Mensaje: ${error.message}`,
      ``,
      `Stack:`,
      error.stack ?? '(sin stack)',
      ``,
      `Component stack:`,
      errorInfo?.componentStack ?? '(sin componentStack)',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      this.setState({ copiado: true });
      setTimeout(() => this.setState({ copiado: false }), 2500);
    } catch {
      // navegador sin clipboard: caer al prompt como fallback
      window.prompt('Copia este error y mandaselo al soporte:', texto);
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error } = this.state;
    const variant = this.props.variant ?? 'inline';
    const scopeLabel = this.props.scope ?? 'la app';

    if (variant === 'full') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-surface border border-line shadow-soft max-w-lg w-full">
            <div className="bg-danger px-6 py-4 border-b-4 border-line">
              <h1 className="font-black text-white text-2xl uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle size={26} /> Algo se rompio
              </h1>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-content font-semibold text-base leading-relaxed">
                Tuvimos un problema cargando {scopeLabel}. Probá recargar la app. Si vuelve a pasar,
                copiá el detalle y mandanoslo por WhatsApp.
              </p>
              <p className="text-xs font-mono text-muted bg-subtle border border-line p-3 break-words">
                {error.message || error.name || 'Error desconocido'}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white h-12 font-display font-black text-base uppercase border border-line shadow-soft hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all"
                >
                  <RotateCw size={18} /> Recargar la app
                </button>
                <a
                  href="https://wa.me/5492804018359?text=Hola!%20La%20app%20de%20ActivaQR%20me%20esta%20dando%20un%20error."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-slate-900 text-white font-bold uppercase tracking-wide text-sm border border-line py-3 hover:bg-slate-800 transition-colors"
                >
                  Avisar por WhatsApp
                </a>
                <button
                  onClick={this.copiarError}
                  className="w-full flex items-center justify-center gap-2 border border-line text-content py-2.5 text-sm font-bold hover:border-content transition-colors"
                >
                  {this.state.copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar detalle del error</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // variante inline: card embebida que no destruye el layout (sidebar + navegacion siguen activos)
    return (
      <div className="bg-surface border border-danger shadow-soft max-w-2xl mx-auto my-6 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-content">
              {scopeLabel}: algo fallo
            </h2>
            <p className="text-sm text-muted mt-1">
              Esta seccion no pudo cargar. El resto de la app sigue funcionando — usa el menu para
              ir a otra parte, o probá recargar.
            </p>
          </div>
        </div>
        <p className="text-xs font-mono text-muted bg-subtle border border-line p-2.5 break-words">
          {error.message || error.name || 'Error desconocido'}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => this.setState({ error: null, errorInfo: null, copiado: false })}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 font-bold uppercase tracking-wide text-sm border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <RotateCw size={14} /> Reintentar
          </button>
          {this.props.onVolver && (
            <button
              onClick={this.props.onVolver}
              className="flex items-center gap-1.5 border border-line text-content px-4 py-2 font-bold uppercase tracking-wide text-sm hover:border-content transition-colors"
            >
              <Home size={14} /> Inicio
            </button>
          )}
          <button
            onClick={this.copiarError}
            className="flex items-center gap-1.5 border border-line text-content px-4 py-2 font-bold uppercase tracking-wide text-sm hover:border-content transition-colors"
          >
            {this.state.copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar error</>}
          </button>
        </div>
      </div>
    );
  }
}

/** Helper para envolver cada ruta de forma corta. Resetea el boundary al cambiar de ruta. */
export const RutaProtegida: React.FC<{ scope: string; resetKey?: string | number; children: React.ReactNode }> = ({ scope, resetKey, children }) => (
  <ErrorBoundary variant="inline" scope={scope} resetKey={resetKey} onVolver={() => { window.location.hash = '#/'; }}>
    {children}
  </ErrorBoundary>
);
