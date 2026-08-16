import { Router } from 'express';
import { prisma } from '../prisma';
import { completarAutorizacionEwelink } from '../ewelinkConnector';
import { verificarEstadoOAuth } from '../iotSecrets';
import { APP_URL } from '../urls';

export const ewelinkOAuthRouter = Router();

function redirect(status: 'connected' | 'pending' | 'error', message?: string) {
  const query = new URLSearchParams({ ewelink: status });
  if (message) query.set('message', message.slice(0, 180));
  return `${APP_URL}/#/control-industrial?${query}`;
}

ewelinkOAuthRouter.get('/callback', async (req, res) => {
  try {
    const code = String(req.query.code ?? '');
    const region = String(req.query.region ?? req.query.regin ?? '');
    const state = verificarEstadoOAuth(String(req.query.state ?? ''));
    if (!code) throw new Error('eWeLink no devolvió el código de autorización.');
    const integrationId = String(state.integrationId ?? '');
    const empresaId = String(state.empresaId ?? '');
    const userId = String(state.userId ?? '');
    const [integration, user] = await Promise.all([
      prisma.integracionIoT.findFirst({ where: { id: integrationId, empresaId, proveedor: 'sonoff_ewelink' } }),
      prisma.usuario.findFirst({ where: { id: userId, empresaId, rol: 'admin', activo: true } }),
    ]);
    if (!integration || !user) throw new Error('La autorización ya no corresponde a un administrador activo de esta empresa.');
    const result = await completarAutorizacionEwelink(integration.id, code, region);
    const pending = 'sincronizacionPendiente' in result && result.sincronizacionPendiente === true;
    res.redirect(303, redirect(pending ? 'pending' : 'connected'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la autorización eWeLink.';
    res.redirect(303, redirect('error', message));
  }
});
