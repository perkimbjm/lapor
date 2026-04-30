import { vi } from 'vitest';

function createQueryBuilder(resolvedValue: { data: any; error: any } = { data: null, error: null }) {
  const builder: any = {
    _resolved: resolvedValue,
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(builder._resolved)),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(builder._resolved)),
    then: vi.fn().mockImplementation((resolve: any) => Promise.resolve(builder._resolved).then(resolve)),
  };
  return builder;
}

export function createMockSupabase() {
  const authChangeCallback: { current: any } = { current: null };
  const queryBuilders: Record<string, ReturnType<typeof createQueryBuilder>> = {};

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockImplementation((cb: any) => {
        authChangeCallback.current = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (!queryBuilders[table]) {
        queryBuilders[table] = createQueryBuilder();
      }
      return queryBuilders[table];
    }),
  };

  return {
    supabase: mockSupabase,
    auth: mockSupabase.auth,
    storage: { from: vi.fn() },
    fireAuthChange: (event: string, session: any) => {
      authChangeCallback.current?.(event, session);
    },
    getQueryBuilder: (table: string) => {
      if (!queryBuilders[table]) {
        queryBuilders[table] = createQueryBuilder();
      }
      return queryBuilders[table];
    },
    createQueryBuilder,
  };
}
