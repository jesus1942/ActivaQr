import { createHash } from 'crypto';

export const NARRACION_HASHES = [
  '23b4aa6e8cfa29b2004f4b17eb798e76ae6c861c0a8314b03fd52cccdb227f01',
  'de73cc4b54e02fa52d0372d40286e917617240626a08fcbcaa9af69aa454f7d8',
  '06dfdab5704f5dafaf8c5688d5d1060d7c81b14751dbd538807a8d95f7114c94',
  '1c66ea1e52a1a8e29fe959ef5555350dc2cb4fc77f367656ee590740df4d3a39',
  '83d7b329f2719582a67e42a58fd8966a7d7c8144d05614e0dc5a12da007676fa',
  '257c46b31258338e564afcbd27fd4b5a411c48b5270da5645276f05246d89e5c',
  '08b19880f43b6a9365254520f52d8b04ee56c90042d8e040972988818c363dca',
  '2f4ec2f09a37952df59cebfed3d75103015c41e2bd8033b30843fe7dce4fc263',
  '4420fa93ca6454505a2aa1cc1bbfadcbb603ba4ca7e0a2bbeefdd2d2d284e89d',
  '5c545532ec27b238fc49254f28e69ffcdba0a35746c927be3e577b952c2437da',
  '6384495fb3e19eb20af248d4b146c42340e57c997f85b84d9200f5e5107667c9',
  '050387995df32b97379c09c9f24dbcae9f5a6e6796e48ec90907f700c92d9c97',
  'cb8f9bb454b194040771b5c5c07178ac16c9627f47ee5a89cb33584f4d04cca6',
  '98242bb2d79e5c91d5998739e574b4b9c57175eba3add7f4077129643ecf7acd',
  '7f797d5d7c82981fb50d9df3b2cffab8e75746b6830c272f5f00bfc954e63afa',
  '61876e13d7780a4d424082ee9b4c15e777a237f5e4d8dacee80a97778c52875e',
  '2d3d42845d969e3d463bd56f00733d7d5a05abbe561b108394fbda89d235e796',
  '7d46cca68ac8de94c47d10354386af62ba3615c9746955e71175cfffeceb839a',
  'f3bbf9e28a25aecfc51edc5e4ea162fcb833b05938c7853c39d807947011d8f9',
  '16012afe630576aef88bfb3d704ce0ad9d1976c1c3e956ee992501585273333d',
  '07bf13c733541c378b3840192ae27e973c50a90fe8a1c3a362c61bcf0bf86416',
  '4f596be10bfebee455f59fbccbc6846ec68056a6052d4b38b0bf56b1513cf4af',
  '8db5b81850c06ea9cb302e8f507f8ff2bf9734ab33389c31fc3c0935ad74a205',
  '1aa124b4277987b0408dcc679b449a0e9c7857211325e3ce71ede1d3499566c0',
  'acb9429b6624e73df6e2690953156f2036f61a9cca059f66b74383c2e6b952d4',
  '9c5b5c8a400e33de3fa17e73637cea60af2fccb522ba41cba8a7652a5e6d1712',
] as const;

export const INSTRUCCIONES_VOZ_RIOPLATENSE = [
  'Hablá únicamente en español de Argentina, con un acento rioplatense natural y estable.',
  'No uses acento castellano de España ni una entonación neutra forzada.',
  'Soná como una persona argentina cálida, profesional y segura que presenta una solución empresarial.',
  'Usá un ritmo pausado: hacé pausas breves y naturales entre ideas y una pausa un poco mayor al terminar cada oración.',
  'Mantené una entonación conversacional y humana. Evitá el tono robótico, la voz de aviso automático y la sobreactuación publicitaria.',
  'Pronunciá ActivaQR como “Activa Q erre”. Pronunciá las siglas letra por letra cuando estén separadas por espacios.',
].join(' ');

type AudioGenerado = {
  contenido: Buffer;
  contentType: string;
};

const cacheAudio = new Map<string, AudioGenerado>();
const generacionesEnCurso = new Map<string, Promise<AudioGenerado>>();

export function hashNarracion(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function narracionAutorizada(lamina: number, texto: string): boolean {
  return Number.isInteger(lamina)
    && lamina >= 0
    && lamina < NARRACION_HASHES.length
    && hashNarracion(texto) === NARRACION_HASHES[lamina];
}

export function vozNaturalConfigurada(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function solicitarAudioOpenAI(texto: string): Promise<AudioGenerado> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('La voz natural todavía no está configurada en el servidor.');
    (error as Error & { status?: number; code?: string }).status = 503;
    (error as Error & { status?: number; code?: string }).code = 'voz_no_configurada';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
        voice: process.env.OPENAI_TTS_VOICE?.trim() || 'marin',
        input: texto,
        instructions: INSTRUCCIONES_VOZ_RIOPLATENSE,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[presentacion-voz] OpenAI rechazó la generación', {
        status: response.status,
        requestId: response.headers.get('x-request-id'),
      });
      const error = new Error('No se pudo generar la narración natural. Intentá nuevamente.');
      (error as Error & { status?: number; code?: string }).status = 502;
      (error as Error & { status?: number; code?: string }).code = 'voz_no_disponible';
      throw error;
    }

    const contenido = Buffer.from(await response.arrayBuffer());
    if (contenido.length < 1_000) {
      const error = new Error('El servicio de voz devolvió un audio incompleto.');
      (error as Error & { status?: number; code?: string }).status = 502;
      (error as Error & { status?: number; code?: string }).code = 'audio_incompleto';
      throw error;
    }

    return {
      contenido,
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generarNarracionNatural(lamina: number, texto: string): Promise<AudioGenerado> {
  if (!narracionAutorizada(lamina, texto)) {
    const error = new Error('El texto no corresponde al guion autorizado de esta lámina.');
    (error as Error & { status?: number; code?: string }).status = 400;
    (error as Error & { status?: number; code?: string }).code = 'narracion_no_autorizada';
    throw error;
  }

  const clave = NARRACION_HASHES[lamina];
  const existente = cacheAudio.get(clave);
  if (existente) return existente;

  const enCurso = generacionesEnCurso.get(clave);
  if (enCurso) return enCurso;

  const generacion = solicitarAudioOpenAI(texto)
    .then((audio) => {
      cacheAudio.set(clave, audio);
      return audio;
    })
    .finally(() => generacionesEnCurso.delete(clave));
  generacionesEnCurso.set(clave, generacion);
  return generacion;
}
