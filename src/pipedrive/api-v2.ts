import { type Config, getBaseUrlV2 } from "../config.js";
import { type HttpClient, type HttpResponse } from "./http-client.js";

export interface V2ListResponse<T = unknown> {
  success: boolean;
  data: T[];
  additional_data?: {
    next_cursor?: string;
    estimated_count?: number;
  };
  error?: string;
}

export interface V2SingleResponse<T = unknown> {
  success: boolean;
  data: T;
  additional_data?: Record<string, unknown>;
  error?: string;
}

export function createApiV2(config: Config, client: HttpClient) {
  const baseUrl = getBaseUrlV2(config);

  async function get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V2SingleResponse<T>>> {
    return client.request<V2SingleResponse<T>>({
      method: "GET",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  async function list<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V2ListResponse<T>>> {
    return client.request<V2ListResponse<T>>({
      method: "GET",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  async function post<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V2SingleResponse<T>>> {
    return client.request<V2SingleResponse<T>>({
      method: "POST",
      url: `${baseUrl}${path}`,
      params,
      body,
    });
  }

  async function patch<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V2SingleResponse<T>>> {
    return client.request<V2SingleResponse<T>>({
      method: "PATCH",
      url: `${baseUrl}${path}`,
      params,
      body,
    });
  }

  async function del<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V2SingleResponse<T>>> {
    return client.request<V2SingleResponse<T>>({
      method: "DELETE",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  return { get, list, post, patch, del };
}

export type ApiV2 = ReturnType<typeof createApiV2>;
