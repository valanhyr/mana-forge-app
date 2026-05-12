# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# --- ESTAS DOS LÍNEAS SON EL PUENTE ---
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# -------------------------------------

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Install openssl to generate self-signed certificates
RUN apk add --no-cache openssl

# Create SSL directory and generate self-signed cert
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=ManaForge/CN=mana-forge.com"

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose ports 80 and 443
EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]