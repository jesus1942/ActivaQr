function sinBarraFinal(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export const SITE_PUBLIC_URL = sinBarraFinal(
  process.env.SITE_PUBLIC_URL || 'https://activaqr.net',
);

function resolverAppUrl(): string {
  const configurada = sinBarraFinal(
    process.env.APP_PUBLIC_URL || `${SITE_PUBLIC_URL}/app`,
  );
  const base = configurada === SITE_PUBLIC_URL
    ? `${SITE_PUBLIC_URL}/app`
    : configurada;
  return `${base}/`;
}

export const APP_PUBLIC_URL = resolverAppUrl();
export const APP_URL = sinBarraFinal(APP_PUBLIC_URL);

const mpConfigurada = process.env.MP_BACK_URL
  ? sinBarraFinal(process.env.MP_BACK_URL)
  : APP_URL;
export const MP_BACK_URL = `${mpConfigurada === SITE_PUBLIC_URL ? APP_URL : mpConfigurada}/`;
