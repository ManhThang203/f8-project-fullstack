import { describe, expect, it } from 'vitest';

import { swaggerSpec } from './swagger.js';

type OpenApiSpec = {
  openapi?: string;
  paths?: Record<string, Record<string, { security?: unknown[]; tags?: string[] }>>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, { required?: string[]; minProperties?: number }>;
  };
  security?: unknown[];
};

describe('swaggerSpec', () => {
  const spec = swaggerSpec as OpenApiSpec;

  it('parse OpenAPI 3 và có đủ path cốt lõi', () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths).toBeTruthy();

    const requiredPaths = [
      '/health',
      '/posts',
      '/posts/reels',
      '/search',
      '/search/users',
      '/users/{username}',
      '/me/profile',
      '/chat/conversations',
      '/admin/users',
      '/admin/reports',
      '/media/upload',
    ];

    for (const p of requiredPaths) {
      expect(spec.paths?.[p], `missing path ${p}`).toBeTruthy();
    }
  });

  it('dùng cookieAuth (Better Auth), không phải bearer JWT', () => {
    expect(spec.components?.securitySchemes?.cookieAuth).toBeTruthy();
    expect(spec.components?.securitySchemes?.bearerAuth).toBeUndefined();
    expect(spec.security).toEqual([{ cookieAuth: [] }]);
  });

  it('route public/optional-auth không bắt buộc cookie', () => {
    const getPosts = spec.paths?.['/posts']?.get;
    const getSearch = spec.paths?.['/search']?.get;
    const getProfile = spec.paths?.['/users/{username}']?.get;
    const getHealth = spec.paths?.['/health']?.get;

    expect(getHealth?.security).toEqual([]);
    // Optional auth: {} | cookieAuth
    expect(getPosts?.security).toEqual(expect.arrayContaining([{}, { cookieAuth: [] }]));
    expect(getSearch?.security).toEqual(expect.arrayContaining([{}, { cookieAuth: [] }]));
    expect(getProfile?.security).toEqual(expect.arrayContaining([{}, { cookieAuth: [] }]));
  });

  it('shared body schemas khớp ràng buộc Zod cơ bản', () => {
    const schemas = spec.components?.schemas ?? {};
    expect(schemas.ReactionBody?.required).toContain('type');
    expect(schemas.UpdatePostBody?.minProperties).toBe(1);
    expect(schemas.UpdateMyProfileBody?.minProperties).toBe(1);
    expect(schemas.UpdateUserSettingsBody?.minProperties).toBe(1);
  });

  it('mọi operation đều có tag', () => {
    let ops = 0;
    for (const methods of Object.values(spec.paths ?? {})) {
      for (const [method, op] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        ops += 1;
        expect(op.tags?.length, `${method} missing tags`).toBeGreaterThan(0);
      }
    }
    expect(ops).toBeGreaterThanOrEqual(70);
  });
});
