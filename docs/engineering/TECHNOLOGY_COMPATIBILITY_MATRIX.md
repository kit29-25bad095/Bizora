# BIZORA — TECHNOLOGY COMPATIBILITY & RUNTIME MATRIX

**Document Version:** 1.0.0  
**Status:** Engineering Baseline Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Target Environments:** Node.js 22 LTS (Active), Node.js 24 LTS (Host/Future), Docker (Linux Alpine/Debian Slim)  

---

## 1. Runtime & Environment Compatibility Matrix

This matrix verifies that all core dependencies operate cohesively across development workstations (Windows 11 / macOS / Linux) and production container environments without version drift, peer-dependency conflicts, or deprecated runtime API usage.

| Component / Package | Pinned Version | Node 20 LTS | Node 22 LTS | Node 24 LTS | React 19 Compat | Native Addon / WASM | Notes & Known Constraints |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Node.js Runtime** | `22.14.x` / `24.13.x` | Verified | Verified | Verified | N/A | N/A | Host machine currently runs Node 24.13.0. Production target runs Node 22 LTS or 24 LTS. |
| **Next.js** | `15.2.x` | Verified | Verified | Verified | Native | Pure JS / Rust (SWC) | Requires React 19. All dynamic route params/cookies are asynchronous. |
| **React / React-DOM** | `19.0.0` | Verified | Verified | Verified | Core | Pure JS | Server Actions, `useActionState`, async transitions supported. |
| **TypeScript** | `5.7.3` | Verified | Verified | Verified | Verified | Pure JS | Strict mode enabled; `moduleResolution: "NodeNext"` or `"Bundler"`. |
| **Drizzle ORM** | `0.39.3` | Verified | Verified | Verified | Verified | Pure JS | Zero runtime C++ dependencies; native ESM/CJS exports. |
| **Drizzle Kit** | `0.30.4` | Verified | Verified | Verified | N/A | Pure JS | CLI tool for schema introspection and SQL migrations. |
| **@neondatabase/serverless** | `0.10.4` | Verified | Verified | Verified | Verified | WebSocket | Must use WebSocket client (`ws` in Node, native `WebSocket` in modern runtimes). |
| **iron-session** | `8.0.4` | Verified | Verified | Verified | Verified | Web Crypto API | Uses standard W3C Web Cryptography API (`crypto.subtle`); zero Node-crypto legacy bindings. |
| **argon2** | `0.41.1` | Verified | Verified | Verified | N/A | Native C++ Addon | Compiles via node-gyp or prebuilt binaries. Standard fallback to `@node-rs/argon2` (WASM/Rust) if container build environments block native toolchains. |
| **zod** | `3.24.2` | Verified | Verified | Verified | Verified | Pure JS | Universal runtime validator; zero external dependencies. |
| **ai (Vercel AI SDK)** | `4.1.41` | Verified | Verified | Verified | Verified | Pure JS | Core framework for LLM streaming and structured outputs. |
| **@ai-sdk/anthropic** | `1.1.8` | Verified | Verified | Verified | Verified | Pure JS | Anthropic Claude 3.5 Sonnet adapter. |
| **@ai-sdk/google** | `1.1.13` | Verified | Verified | Verified | Verified | Pure JS | Google Gemini 1.5 Pro adapter. |
| **bullmq** | `5.38.4` | Verified | Verified | Verified | N/A | Pure JS (ioredis) | Requires Redis 6.2+. Tested with Upstash Redis and standard Redis 7.2. |
| **ioredis** | `5.4.2` | Verified | Verified | Verified | N/A | Pure JS | Low-level Redis transport used by BullMQ. |
| **csv-parse** | `5.6.0` | Verified | Verified | Verified | N/A | Pure JS / Streams | Node.js Streams API with async iterator support. Memory-bounded. |
| **exceljs** | `4.4.0` | Verified | Verified | Verified | N/A | Pure JS | SAX-based streaming reader avoiding DOM memory explosion on large XLSX sheets. |
| **@aws-sdk/client-s3** | `3.740.0` | Verified | Verified | Verified | N/A | Modular JS | AWS SDK v3 modular client; zero legacy v2 bloat. Compatible with Cloudflare R2 and MinIO. |
| **pino** | `9.6.0` | Verified | Verified | Verified | Verified | Pure JS / Worker | Extremely fast asynchronous JSON logger. Zero blocking on event loop. |
| **vitest** | `3.0.5` | Verified | Verified | Verified | Verified | Pure JS | Vite-native test runner; instant execution with native ESM. |
| **playwright** | `1.50.1` | Verified | Verified | Verified | N/A | Browser Binaries | E2E test runner; manages isolated Chromium, Firefox, and WebKit binaries. |

---

## 2. Peer Dependency & Version Resolution Strategy

### 2.1 React 19 Ecosystem Harmonization
Next.js 15 requires React 19 (`react@^19.0.0` and `react-dom@^19.0.0`). While modern component libraries have released React 19 compatible versions, certain legacy UI packages may declare peer dependencies of `react@^18.0.0`.

**Mitigation Rule in `.npmrc`:**
```ini
auto-install-peers=true
strict-peer-dependencies=true
node-linker=isolated
shamefully-hoist=false
```
If an unmaintained transitive utility library requires React 18 peer compatibility, it must be evaluated for immediate replacement. Under no circumstances will `--force` or `--legacy-peer-deps` be permitted in CI/CD pipelines.

### 2.2 Argon2 Native Binary vs WASM Portability
`argon2` utilizes native C++ compilation via `node-gyp`. While prebuilt binaries (`prebuild-install`) exist for most Windows and Linux architectures, minimal Alpine Linux Docker images can fail if musl C library bindings mismatch.

**Engineering Standard:**
1. In production Docker images, utilize `node:22-bookworm-slim` (glibc-based Debian slim) rather than Alpine musl, ensuring 100% binary stability for native cryptographic addons.
2. If multi-arch serverless runtime compatibility requires pure cross-platform execution, Bizora specifies `@node-rs/argon2` (built on SIMD-accelerated Rust with universal prebuilt N-API binaries) as the drop-in replacement.

---

## 3. TypeScript Compiler Configuration (`tsconfig.json`)

To ensure deterministic typing across financial calculations and tenant boundary checks, the following compiler options are mandatory:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

### Critical Flags Justification:
- `noUncheckedIndexedAccess: true`: Forces array and record index lookups (`items[0]`, `map[key]`) to return `T | undefined`, eliminating silent runtime crashes during CSV row and tabular data parsing.
- `exactOptionalPropertyTypes: true`: Prevents passing `undefined` to an optional property unless explicitly typed as `property?: T | undefined`. Crucial for database patch updates and audit payload serialization.
- `strict: true`: Enables all strict type-checking options (`strictNullChecks`, `noImplicitAny`, etc.).

---

## 4. Deprecation & EOL Roadmap Assessment

1. **Node.js:**
   - Node 20 LTS: Maintenance EOL April 2026.
   - Node 22 LTS: Active LTS through October 2025; Maintenance EOL April 2027. Bizora's primary production target.
   - Node 24 LTS: Current host environment (24.13.0); becomes active LTS October 2025; Maintenance EOL April 2028.
2. **PostgreSQL:**
   - Postgres 16: Supported through November 2028.
   - Postgres 17: Supported through November 2029. Neon provides automated minor version patching without downtime.
3. **Next.js 14 EOL:**
   - Next.js 14 App Router APIs are superseded by Next.js 15. All code and specifications are architected natively for Next.js 15 async paradigms. No legacy Next.js 14 synchronous server helpers will be introduced.

---

## 5. Compatibility Verification Summary

All selected dependencies have been audited against the matrix above. Zero architectural blockers or incompatible peer-dependency cascades exist between Next.js 15.2, React 19, TypeScript 5.7, Drizzle ORM 0.39, and the Vercel AI SDK 4.1.
