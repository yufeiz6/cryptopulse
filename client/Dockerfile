# ---------- Stage 1: build ----------
# Use Node to compile the React app into static files
FROM node:22 AS build
WORKDIR /app

# Install dependencies first (cached unless package.json changes)
COPY package*.json ./
RUN npm install

# Copy the rest of the source and build
COPY . ./
RUN npm run build
# Output goes to /app/dist

# ---------- Stage 2: serve ----------
# Use a tiny nginx image to serve the static files
FROM nginx:alpine AS serve

# Copy the built static files into nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx serves on port 80 by default
EXPOSE 80

# nginx starts automatically; no ENTRYPOINT needed