FROM nginx:alpine
RUN mkdir -p /etc/nginx/ssl

# Copy your existing config (renamed to locations.conf)
COPY locations.conf /etc/nginx/conf.d/locations.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html

# Copy the environment-specific wrapper
ARG NGINX_ENV=dev
COPY default.conf.${NGINX_ENV} /etc/nginx/conf.d/default.conf

# Keep your existing logging setup
RUN ln -sf /dev/stdout /var/log/nginx/access.log
RUN ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
