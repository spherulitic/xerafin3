#syntax=docker/dockerfile:1

FROM mongo:latest

COPY ./*.js /docker-entrypoint-initdb.d/
RUN chmod -R 777 /docker-entrypoint-initdb.d/*.js
