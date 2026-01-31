FROM nginx:stable-alpine-slim
RUN mkdir -p /etc/nginx/ssl

# Copy your existing config (renamed to locations.conf)
COPY locations.conf /etc/nginx/conf.d/locations.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html

# Copy the environment-specific wrapper
ARG NGINX_ENV=dev
COPY default.conf.${NGINX_ENV} /etc/nginx/conf.d/default.conf

# Get environment-specific Keycloak URL in place for keycloak init
ARG KEYCLOAK_URL=https://auth.localhost:7443
ENV KEYCLOAK_URL=${KEYCLOAK_URL}
RUN sed -i "s|__KEYCLOAK_URL__|${KEYCLOAK_URL}|" /usr/share/nginx/html/index.htm

# Keep your existing logging setup
RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
