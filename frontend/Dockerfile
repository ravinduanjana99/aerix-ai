# ==========================================
# STAGE 1: Build the React Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Layer Caching: Copy package manifests first
COPY package.json package-lock.json ./

# Install dependencies (using legacy peer deps for React 19 compatibility)
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY . .

# Build production bundle
RUN npm run build

# ==========================================
# STAGE 2: Serve with Lightweight Nginx
# ==========================================
FROM nginx:alpine

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from Stage 1 builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]