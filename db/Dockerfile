FROM postgres:17-alpine

COPY db/init/ /docker-entrypoint-initdb.d/

RUN chmod 755 /docker-entrypoint-initdb.d \
    && chmod 644 /docker-entrypoint-initdb.d/*.sql