FROM arangodb/arangodb:3.7.3

RUN apk update
RUN apk add jq
RUN apk add zip
RUN apk add unzip
RUN apk add --no-cache openssl
RUN apk add --no-cache --upgrade grep

ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

VOLUME ["/var/lib/foxxdb"]

RUN echo "vm.overcommit_memory=2" >> /etc/sysctl.conf
RUN echo "vm.overcommit_ratio=100" >> /etc/sysctl.conf

ADD ./docker-scripts /scripts
RUN mkdir install

ADD ./dist /sources
RUN zip -r database-service.zip ./sources
RUN sed -e 's/\r/\n/' -i scripts/start.sh


CMD [ "sh","-c","sh scripts/start.sh"]
