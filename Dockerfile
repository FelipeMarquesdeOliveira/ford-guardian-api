# ---------- dependências de produção ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---------- runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
# O runtime não precisa de npm/corepack: removê-los elimina CVEs da imagem base e reduz a superfície de ataque
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node mockData ./mockData
# usuário sem privilégios (a imagem oficial já traz o usuário "node")
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/health"]
CMD ["node", "src/index.js"]
