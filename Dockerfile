FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json vitest.config.ts ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN node node_modules/typescript/bin/tsc -b --pretty false

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN groupadd --system employee && useradd --system --gid employee --create-home employee
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=build /workspace/apps/mcp-server/package.json ./apps/mcp-server/package.json
COPY --from=build /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /workspace/packages/domain/dist ./packages/domain/dist
COPY --from=build /workspace/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /workspace/packages/adapters/dist ./packages/adapters/dist
COPY --from=build /workspace/packages/adapters/package.json ./packages/adapters/package.json
USER employee
EXPOSE 3000
CMD ["node", "apps/mcp-server/dist/index.js"]
