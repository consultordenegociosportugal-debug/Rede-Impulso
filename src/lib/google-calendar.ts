// Integração com o Google Agenda via REST puro (fetch) — sem o pacote
// `googleapis`. São só quatro endpoints (consentimento, troca de
// código, refresh e o CRUD de eventos), então uma dependência de
// dezenas de megabytes não se paga aqui.
//
// Regra de ouro deste módulo: ele é uma camada OPCIONAL. Se as
// variáveis de ambiente não existirem, `googleCalendarConfigurado()`
// devolve false e nada mais é chamado — mesmo padrão do
// `if (!process.env.ANTHROPIC_API_KEY)` em /api/assistente.

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars";

// Escopo mínimo: criar/editar/apagar eventos. Não pede leitura da
// agenda inteira nem dados do perfil.
const ESCOPO = "https://www.googleapis.com/auth/calendar.events";

// Duração padrão de uma visita quando o produto não pergunta isso.
export const DURACAO_VISITA_MINUTOS = 60;

// Fuso usado no evento. As datas vão em ISO com offset, então o fuso
// serve só para o Google exibir/repetir corretamente.
const FUSO = "America/Sao_Paulo";

export type GoogleCalendarConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/** Lê as três variáveis de ambiente; devolve null se faltar qualquer uma. */
export function lerConfig(): GoogleCalendarConfig | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Usado por Server Components para decidir entre mostrar o botão
 * "Conectar Google Agenda" ou o estado "não configurado". Nunca
 * expõe os valores das variáveis para o cliente.
 */
export function googleCalendarConfigurado(): boolean {
  return lerConfig() !== null;
}

/**
 * URL de consentimento. `access_type=offline` + `prompt=consent` são
 * obrigatórios para receber o refresh_token — sem ele a conexão morre
 * na primeira expiração do access_token.
 */
export function montarUrlConsentimento(config: GoogleCalendarConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

type RespostaToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function pedirToken(corpo: URLSearchParams): Promise<RespostaToken | null> {
  try {
    const resposta = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
    });
    const dados = (await resposta.json()) as RespostaToken;
    if (!resposta.ok || dados.error || !dados.access_token) return null;
    return dados;
  } catch {
    return null;
  }
}

/** Troca o `code` do callback pelos tokens. Null em qualquer falha. */
export async function trocarCodigoPorTokens(
  config: GoogleCalendarConfig,
  code: string,
) {
  return pedirToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  );
}

/** Renova o access_token a partir do refresh_token guardado. */
export async function renovarAccessToken(
  config: GoogleCalendarConfig,
  refreshToken: string,
) {
  return pedirToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  );
}

/** Momento de expiração a partir do `expires_in` (segundos) do Google. */
export function calcularExpiracao(expiresIn?: number) {
  const segundos = typeof expiresIn === "number" ? expiresIn : 3600;
  return new Date(Date.now() + segundos * 1000).toISOString();
}

/** Considera expirado 60s antes da hora, para não perder a corrida. */
export function tokenExpirado(expiraEm: string | null) {
  if (!expiraEm) return true;
  return new Date(expiraEm).getTime() - 60_000 <= Date.now();
}

export type EventoVisita = {
  titulo: string;
  descricao: string;
  inicio: Date;
  duracaoMinutos?: number;
};

/**
 * Cria o evento e devolve o id. Null em qualquer falha — quem chama
 * trata isso como "visita existe, só não sincronizou".
 */
export async function criarEvento(
  accessToken: string,
  calendarId: string,
  evento: EventoVisita,
): Promise<string | null> {
  const fim = new Date(
    evento.inicio.getTime() +
      (evento.duracaoMinutos ?? DURACAO_VISITA_MINUTOS) * 60 * 1000,
  );

  try {
    const resposta = await fetch(
      `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: evento.titulo,
          description: evento.descricao,
          start: { dateTime: evento.inicio.toISOString(), timeZone: FUSO },
          end: { dateTime: fim.toISOString(), timeZone: FUSO },
        }),
      },
    );

    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as { id?: string };
    return dados.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Apaga o evento sincronizado (visita cancelada). Devolve true também
 * para 404/410: o evento já não está lá, que é o resultado desejado.
 */
export async function apagarEvento(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<boolean> {
  try {
    const resposta = await fetch(
      `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return resposta.ok || resposta.status === 404 || resposta.status === 410;
  } catch {
    return false;
  }
}
