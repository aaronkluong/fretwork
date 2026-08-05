# Cloudflare Pages Implementation Guide

## Build Configuration
* **Build command**: `pnpm build:pages` (run from root `/`)
* **Deploy command**: `pnpm pages:deploy` (run from root `/`)
* **Version command**: `pnpm pages:deploy` (run from root `/`)
* **Root directory**: `/` (Monorepo root)

---

## Cloudflare Pages Implementation Guide (OpenNext)

* **Project**: Fretwork
* **Target Platform**: Cloudflare Pages
* **Runtime**: Cloudflare Edge Runtime (Experimental)
* **Adapter**: `@opennextjs/cloudflare` (OpenNext)
* **Next.js Version**: 16.1.4 (Turbopack)

This guide provides the technical configuration and deployment workflows for hosting the Fretwork application on Cloudflare Pages using the OpenNext adapter.

### 1. Architecture Overview
The application utilizes the Next.js 16 App Router with Turbopack. To ensure compatibility with Cloudflare’s global edge network, we utilize `@opennextjs/cloudflare`.
* **Build Engine**: Turbopack is enabled for optimized production builds.
* **Edge Runtime**: The application targets the Cloudflare Edge Runtime. Note that as of Next.js 16, this is considered experimental and APIs may evolve.
* **Adapter**: `@opennextjs/cloudflare` transforms standard `next build` output into a Cloudflare-compatible Worker script and asset bundle.
* **Output Path**: The final assets and worker script are generated in `fretwork/.open-next/`.

### 2. Configuration

#### 2.1 Root .npmrc (Windows compatibility)
Fixes the Windows symlink EPERM error during build by forcing pnpm to use a flat installation layout (`node-linker = hoisted`).

#### 2.2 next.config.ts configuration
Allows Next.js standalone tracing to locate monorepo packages by defining the root directory path in `outputFileTracingRoot`.

#### 2.3 `fretwork/wrangler.toml`
Governs the Cloudflare deployment environment.
```toml
name = "guitar-capstone"
compatibility_date = "2024-11-20"
main = ".open-next/worker.js"
compatibility_flags = ["nodejs_compat"]
workers_dev = true
preview_urls = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

#### 2.4 `fretwork/open-next.config.ts`
The configuration for the OpenNext adapter.
```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

### 3. Middleware to Proxy Migration
Next.js 16+ has deprecated the `middleware.ts` convention in favor of `proxy.ts`. This change clarifies that the logic runs at the Edge as a network boundary (Proxy) rather than standard application middleware.

#### 3.1 Migration Status
* **Current Status**: No active middleware file exists in `fretwork/src/`.
* **Recommended Action**: If edge routing or request interception is needed, create `fretwork/src/proxy.ts` and define the `proxy` function.

#### 3.2 Manual Migration Steps (If adding a proxy)
1. Create or rename the file to `fretwork/src/proxy.ts`.
2. Export the proxy function:
   ```typescript
   export function proxy(request: NextRequest) { ... }
   ```

Alternatively, use the Next.js codemod:
```bash
npx @next/codemod@canary middleware-to-proxy .
```

### 4. Management
* **Dashboard**: Add variables in *Workers & Pages > [Project Name] > Settings > Variables and Secrets*.
* **Static Bundling**: Variables prefixed with `NEXT_PUBLIC_` are bundled at build time. You must trigger a new build/deploy after changing these.
* **Local Dev**: Create a `.env.local` file in `fretwork/` to declare variables such as `NEXT_PUBLIC_API_URL=http://localhost:8000` to route client-side transcription requests to the local Python FastAPI backend. Do not commit this file to GitHub.

### 5. Build & Deployment Workflow
Based on current codebase scripts and tool chains (Node v22+, pnpm):

| Command | Directory | Description |
| :--- | :--- | :--- |
| `pnpm run build:pages` | Workspace Root `/` | Executes `opennextjs-cloudflare build` inside `fretwork/` workspace context. |
| `pnpm run pages:deploy` | Workspace Root `/` | Deploys the `.open-next` bundle using `wrangler deploy`. |
| `pnpm run dev` | `fretwork/` | Launches local Next.js development server with Turbopack. |

#### 5.1 Deployment Output
Successful builds deploy to the configured Cloudflare Pages domain or:
`https://guitar-capstone.kobbyhanson.workers.dev` (or the corresponding configured custom domain).

### 6. Development Notes
* **`nodejs_compat`**: This flag is mandatory in `wrangler.toml` to support Node.js APIs within the Worker environment.
* **Telemetry**: Both Turborepo and Next.js collect anonymous telemetry.
* **Experimental Warnings**: Expect warnings regarding the experimental nature of the Edge Runtime in Next.js 16. These are expected and do not currently block deployment.
