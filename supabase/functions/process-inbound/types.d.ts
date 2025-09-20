// Type declarations for Deno runtime
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="deno.ns" />

declare namespace Deno {
  function serve(handler: (req: Request) => Promise<Response>): void;
  const env: {
    get(key: string): string | undefined;
  };
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}
