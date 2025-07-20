import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { StructuredLogger } from '@app/common/logging';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private client: AxiosInstance;
  private config: HttpClientConfig;
  private logger: StructuredLogger;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.logger = new StructuredLogger('HTTPClient');

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.log('HTTP request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        this.logger.error('HTTP request error', error.stack, {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.log('HTTP response', {
          status: response.status,
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
        });
        return response;
      },
      (error) => {
        this.logger.error('HTTP response error', error.stack, {
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          error: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (retryCount < this.config.maxRetries! && this.shouldRetry(error)) {
        this.logger.warn('Retrying HTTP request', {
          retryCount: retryCount + 1,
          maxRetries: this.config.maxRetries,
          error: error.message,
        });
        await this.delay(this.config.retryDelay!);
        return this.retryRequest(requestFn, retryCount + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.client.get<T>(url, config));
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.client.post<T>(url, data, config));
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.client.put<T>(url, data, config));
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.client.patch<T>(url, data, config));
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.client.delete<T>(url, config));
    return response.data;
  }
} 