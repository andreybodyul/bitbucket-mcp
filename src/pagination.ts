import type { AxiosInstance } from "axios";
import type winston from "winston";
import type { ApiVariant } from "./api-adapter.js";

export const BITBUCKET_DEFAULT_PAGELEN = 10;
export const BITBUCKET_MAX_PAGELEN = 100;
export const BITBUCKET_ALL_ITEMS_CAP = 1000;

export interface PaginationRequestOptions {
  pagelen?: number;
  page?: number;
  all?: boolean;
  params?: Record<string, any>;
  defaultPagelen?: number;
  maxItems?: number;
  description?: string;
}

export interface PaginatedValuesResult<T> {
  values: T[];
  page?: number;
  pagelen: number;
  next?: string;
  fetchedPages: number;
  totalFetched: number;
  previous?: string;
}

interface PendingRequestConfig {
  url: string;
  params?: Record<string, any>;
}

export class BitbucketPaginator {
  constructor(
    private readonly api: AxiosInstance,
    private readonly logger: winston.Logger,
    private readonly variant: ApiVariant = "cloud"
  ) {}

  async fetchValues<T>(
    path: string,
    options: PaginationRequestOptions = {}
  ): Promise<PaginatedValuesResult<T>> {
    const {
      pagelen,
      page,
      all = false,
      params = {},
      defaultPagelen = BITBUCKET_DEFAULT_PAGELEN,
      maxItems = BITBUCKET_ALL_ITEMS_CAP,
      description,
    } = options;

    const resolvedPagelen = this.normalizePagelen(
      pagelen ?? defaultPagelen
    );

    const requestParams: Record<string, any> = {
      ...params,
      ...this.buildPaginationParams(resolvedPagelen, page),
    };

    const shouldFetchAll = all === true && page === undefined;
    const requestDescriptor: PendingRequestConfig = {
      url: path,
      params: requestParams,
    };

    if (!shouldFetchAll) {
      const response = await this.performRequest(
        requestDescriptor,
        description
      );
      const values = this.extractValues<T>(response.data);
      return {
        values,
        page: response.data?.page ?? page,
        pagelen: response.data?.pagelen ?? response.data?.limit ?? resolvedPagelen,
        next: response.data?.next,
        previous: response.data?.previous,
        fetchedPages: 1,
        totalFetched: values.length,
      };
    }

    const aggregated: T[] = [];
    let fetchedPages = 0;
    let nextRequest: PendingRequestConfig | undefined = requestDescriptor;
    let firstPageMeta: {
      page?: number;
      pagelen: number;
      previous?: string;
    } = { pagelen: resolvedPagelen };

    while (nextRequest && aggregated.length < maxItems) {
      const response = await this.performRequest(nextRequest, description, {
        page: fetchedPages + 1,
      });
      fetchedPages += 1;

      if (fetchedPages === 1) {
        firstPageMeta = {
          page: response.data?.page ?? response.data?.start,
          pagelen: response.data?.pagelen ?? response.data?.limit ?? resolvedPagelen,
          previous: response.data?.previous,
        };
      }

      const values = this.extractValues<T>(response.data);
      aggregated.push(...values);

      // Check if there are more pages
      const hasMore = this.hasMorePages(response.data);
      if (!hasMore) {
        nextRequest = undefined;
        break;
      }

      if (aggregated.length >= maxItems) {
        this.logger.debug("Bitbucket pagination cap reached", {
          description: description ?? path,
          maxItems,
        });
        nextRequest = undefined;
        break;
      }

      this.logger.debug("Following Bitbucket pagination next link", {
        description: description ?? path,
        fetchedPages,
        totalFetched: aggregated.length,
      });

      nextRequest = this.buildNextRequest(response.data, path, resolvedPagelen);
    }

    if (aggregated.length > maxItems) {
      aggregated.length = maxItems;
    }

    return {
      values: aggregated,
      page: firstPageMeta.page,
      pagelen: firstPageMeta.pagelen,
      previous: firstPageMeta.previous,
      fetchedPages,
      totalFetched: aggregated.length,
    };
  }

  private buildPaginationParams(
    pagelen: number,
    page?: number
  ): Record<string, any> {
    if (this.variant === "server") {
      const params: Record<string, any> = { limit: pagelen };
      if (page !== undefined) {
        params.start = (page - 1) * pagelen;
      }
      return params;
    }
    // Cloud
    const params: Record<string, any> = { pagelen };
    if (page !== undefined) {
      params.page = page;
    }
    return params;
  }

  private hasMorePages(data: any): boolean {
    if (this.variant === "server") {
      return data?.isLastPage === false;
    }
    return !!data?.next;
  }

  private buildNextRequest(
    data: any,
    originalPath: string,
    pagelen: number
  ): PendingRequestConfig | undefined {
    if (this.variant === "server") {
      if (data?.isLastPage === false && data?.nextPageStart !== undefined) {
        return {
          url: originalPath,
          params: { limit: pagelen, start: data.nextPageStart },
        };
      }
      return undefined;
    }
    // Cloud — follow the next URL
    if (data?.next) {
      return { url: data.next };
    }
    return undefined;
  }

  private async performRequest(
    request: PendingRequestConfig,
    description?: string,
    extra?: Record<string, any>
  ) {
    this.logger.debug("Calling Bitbucket API", {
      description: description ?? request.url,
      url: request.url,
      params: request.params,
      ...extra,
    });
    const config = request.params ? { params: request.params } : undefined;
    return this.api.get(request.url, config);
  }

  private extractValues<T>(data: any): T[] {
    if (Array.isArray(data?.values)) {
      return data.values as T[];
    }
    if (Array.isArray(data)) {
      return data as T[];
    }
    return [];
  }

  private normalizePagelen(value?: number): number {
    if (value === undefined || Number.isNaN(value)) {
      return BITBUCKET_DEFAULT_PAGELEN;
    }
    const integer = Math.floor(value);
    if (!Number.isFinite(integer) || integer < 1) {
      return 1;
    }
    return Math.min(integer, BITBUCKET_MAX_PAGELEN);
  }
}
