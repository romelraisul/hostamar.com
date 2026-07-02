FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /var/cache/nginx/static /var/cache/nginx/ai
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]