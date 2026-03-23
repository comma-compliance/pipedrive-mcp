import { type Config, getBaseUrlV1 } from "../config.js";
import { type HttpClient, type HttpResponse } from "./http-client.js";

export interface V1ListResponse<T = unknown> {
  success: boolean;
  data: T[] | null;
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
  };
  error?: string;
}

export interface V1SingleResponse<T = unknown> {
  success: boolean;
  data: T | null;
  additional_data?: Record<string, unknown>;
  error?: string;
}

export function createApiV1(config: Config, client: HttpClient) {
  const baseUrl = getBaseUrlV1(config);

  async function get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1SingleResponse<T>>> {
    return client.request<V1SingleResponse<T>>({
      method: "GET",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  async function list<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1ListResponse<T>>> {
    return client.request<V1ListResponse<T>>({
      method: "GET",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  async function post<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1SingleResponse<T>>> {
    return client.request<V1SingleResponse<T>>({
      method: "POST",
      url: `${baseUrl}${path}`,
      params,
      body,
    });
  }

  async function put<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1SingleResponse<T>>> {
    return client.request<V1SingleResponse<T>>({
      method: "PUT",
      url: `${baseUrl}${path}`,
      params,
      body,
    });
  }

  async function patch<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1SingleResponse<T>>> {
    return client.request<V1SingleResponse<T>>({
      method: "PATCH",
      url: `${baseUrl}${path}`,
      params,
      body,
    });
  }

  async function del<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<HttpResponse<V1SingleResponse<T>>> {
    return client.request<V1SingleResponse<T>>({
      method: "DELETE",
      url: `${baseUrl}${path}`,
      params,
    });
  }

  return { get, list, post, put, patch, del };
}

export type ApiV1 = ReturnType<typeof createApiV1>;
