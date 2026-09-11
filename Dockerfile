FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json vitest.config.ts ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @employee-plus/mcp-app build
RUN node node_modules/typescript/bin/tsc -b --pretty false

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN groupadd --system employee && useradd --system --gid employee --create-home employee
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mcp-server/package.json ./apps/mcp-server/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/adapters/package.json ./packages/adapters/package.json
RUN pnpm install --frozen-lockfile --prod --filter @employee-plus/mcp-server...
COPY --from=build /workspace/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /workspace/packages/domain/dist ./packages/domain/dist
COPY --from=build /workspace/packages/adapters/dist ./packages/adapters/dist
COPY --from=build /workspace/apps/mcp-app/dist/index.inline.html ./apps/mcp-app/dist/index.inline.html
USER employee
EXPOSE 3000
CMD ["node", "apps/mcp-server/dist/index.js"]
