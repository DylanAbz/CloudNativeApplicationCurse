# Stage 1: Build the Vue.js application
FROM node:alpine AS build

# Set the build-time argument for the API URL
ARG VITE_API_BASE_URL
# Set the environment variable for the build process so Vite can use it
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

WORKDIR /app

# Copy package.json and potential lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Remove the default Nginx welcome page
RUN rm -f /usr/share/nginx/html/index.html

# Copy the built assets from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# The Nginx container will automatically start Nginx by default
# CMD ["nginx", "-g", "daemon off;"]
