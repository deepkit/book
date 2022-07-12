FROM node:16-alpine

RUN apk --no-cache add openssh g++ gcc git libgcc libstdc++ linux-headers make python3 libexecinfo-dev

WORKDIR /app

# first package manager stuff so installing is cached by Docker.
ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json
RUN npm ci

ADD . /app
RUN git config --global user.email "you@example.com"
RUN git config --global user.name "Your Name"
RUN cd /app && git init && git add . && git commit --allow-empty -m "Initialize repository"

RUN mkdir build
RUN cd /app/src/chinese && ln -s ../modules modules
RUN cd /app/src/english && ln -s ../modules modules
RUN make all
#RUN node -r ts-node/register scripts/build.ts german
#RUN node -r ts-node/register scripts/build.ts english
#RUN node -r ts-node/register scripts/build.ts chinese
#RUN node -r ts-node/register scripts/build.ts polish

FROM nginx:1.21

WORKDIR /usr/share/nginx/html

COPY --from=0 /app/build /usr/share/nginx/html
ADD src/index.html /usr/share/nginx/html/index.html

RUN echo 'server {\
            port_in_redirect off;\
            listen $PORT default_server;\
            location / {\
              root   /usr/share/nginx/html;\
              index  index.html index.htm;\
            }\
            location = / { \
                return 302 /english/;\
            }\
          }' > /etc/nginx/conf.d/default.conf.template
CMD /bin/bash -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf" && nginx -g 'daemon off;'
