import api from './client';

/**
 * The Mehman AI assistant.
 *
 * Every call here goes to Mehman's own API. There is no model-provider SDK in this app
 * and no API key in the bundle — a shipped React Native binary is readable, so a key
 * embedded here would be a key given away. It lives only in the API server's environment.
 *
 * The same endpoint backs the website; see `src/services/aiService.ts` in Mehman.co.
 */

/** The two languages the assistant answers in. */
export type AiLanguage = 'en' | 'ur';

/** "support" answers questions; "listing" helps a host draft listing copy. */
export type AiMode = 'support' | 'listing';

export interface AiTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiReply {
  message: string;
  language: AiLanguage;
  escalated: boolean;
  /** "payment" | "account_security" | "legal" | "complaint" | "sensitive" | null */
  escalationReason: string | null;
  /** Present only when the transcript was stored, i.e. the person is signed in. */
  sessionId: string | null;
}

export interface AiStatus {
  available: boolean;
  languages: AiLanguage[];
}

/** Mirrors the server's own cap, so an over-long message never leaves the phone. */
export const MAX_MESSAGE_LENGTH = 2000;

export interface AskOptions {
  message: string;
  mode?: AiMode;
  /** Only when the person has chosen. Undefined lets the server detect from the text. */
  language?: AiLanguage;
  sessionId?: string | null;
  history?: AiTurn[];
}

/** A failure the chat can render as a message. `message` is always safe to show. */
export class AiError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'AiError';
    this.retryable = retryable;
  }
}

export const aiApi = {
  status: async (): Promise<AiStatus> => {
    try {
      const response = await api.get<AiStatus>('/api/ai/status');
      return response.data;
    } catch {
      return { available: false, languages: ['en', 'ur'] };
    }
  },

  ask: async ({ message, mode, language, sessionId, history }: AskOptions): Promise<AiReply> => {
    try {
      const response = await api.post<AiReply>('/api/ai/chat', {
        message,
        mode: mode ?? 'support',
        language: language ?? null,
        sessionId: sessionId ?? null,
        // Only the turns — anything else the screen keeps on a message is ours.
        history: (history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;

      if (status === 429) {
        throw new AiError(
          'You are sending messages faster than I can answer. Give it a moment and try again.',
          true,
        );
      }
      if (status === 503) {
        throw new AiError(
          serverMessage || 'The assistant is unavailable right now. Please try again shortly.',
          true,
        );
      }
      if (status === 400) {
        // The person has to change something, so retrying the same text will not help.
        throw new AiError(serverMessage || 'That message could not be sent.', false);
      }
      throw new AiError('Something went wrong reaching the assistant. Please try again.', true);
    }
  },

  /** The signed-in caller's own stored transcripts. */
  sessions: async () => {
    const response = await api.get('/api/ai/sessions');
    return response.data;
  },

  session: async (sessionId: string): Promise<AiTurn[]> => {
    const response = await api.get<AiTurn[]>(`/api/ai/sessions/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/api/ai/sessions/${sessionId}`);
  },
};

export default aiApi;
