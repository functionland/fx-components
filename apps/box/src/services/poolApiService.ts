import { SupportedChain } from '../contracts/types';

export interface JoinPoolRequest {
  peerId: string;
  kuboPeerId?: string;
  account: string;
  chain: SupportedChain;
  poolId: number;
}

export interface JoinPoolResponse {
  status: 'ok' | 'err';
  msg: string;
  transactionHash?: string;
  errors?: Array<{ field: string; message: string }>;
}

const FETCH_TIMEOUT_MS = 60000;

export class PoolApiService {
  private static readonly BASE_URL = 'https://pools.fx.land';

  private static async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static handleAbortError(error: unknown): JoinPoolResponse | null {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'err',
        msg: 'Request timed out. Please try again.',
      };
    }
    return null;
  }

  private static async handleResponse(
    response: Response
  ): Promise<JoinPoolResponse> {
    if (response.status === 429) {
      return {
        status: 'err',
        msg: 'Too many requests. Please wait a few minutes and try again.',
      };
    }

    if (!response.ok) {
      return {
        status: 'err',
        msg: `HTTP error! status: ${response.status}`,
      };
    }

    const data: JoinPoolResponse = await response.json();
    if (data.errors?.length) {
      data.msg = data.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    }
    return data;
  }

  static async joinPool(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      return await this.handleResponse(response);
    } catch (error) {
      const abortResult = this.handleAbortError(error);
      if (abortResult) return abortResult;

      console.error('Pool API join error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async cancelJoinRequest(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      return await this.handleResponse(response);
    } catch (error) {
      const abortResult = this.handleAbortError(error);
      if (abortResult) return abortResult;

      console.error('Pool API cancel error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  static async leavePool(request: JoinPoolRequest): Promise<JoinPoolResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.BASE_URL}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      return await this.handleResponse(response);
    } catch (error) {
      const abortResult = this.handleAbortError(error);
      if (abortResult) return abortResult;

      console.error('Pool API leave error:', error);
      return {
        status: 'err',
        msg: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
