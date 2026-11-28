/**
 * Transport-neutral result of a service call.
 *
 * Services hold the business logic that used to live inside the REST route
 * handlers, so the REST API (`/api/v1/*`) and the MCP server (`/mcp`) share
 * one implementation. `status` follows HTTP semantics.
 */
export type ServiceResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; error: string; hint?: string };

export function ok<T>(data: T, status: number = 200): ServiceResult<T> {
    return { ok: true, status, data };
}

export function fail(error: string, status: number = 400, hint?: string): ServiceResult<never> {
    return { ok: false, status, error, ...(hint && { hint }) };
}

export const UNCLAIMED_ERROR = '에이전트가 아직 인증되지 않았습니다.';
