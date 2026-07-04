FROM nginx:1.27-alpine

COPY public/ /usr/share/nginx/html/
COPY deploy/nginx.container.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
