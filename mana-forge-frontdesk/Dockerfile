# Build only from the lockfile; host node_modules and secrets never enter the image.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY src ./src
ARG VITE_API_URL=/api
ARG VITE_USE_MOCKS=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build

# Optional CI target: docker build --target test .
FROM build AS test
RUN npm test -- --maxWorkers=2 --testTimeout=15000

# TLS is terminated by the host ingress. This listener is loopback-bound in Compose.
FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/healthz"]
CMD ["nginx", "-g", "daemon off;"]
