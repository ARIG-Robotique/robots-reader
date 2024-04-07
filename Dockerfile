FROM node:18-alpine as final

RUN apk add --update --no-cache openssh

EXPOSE 4100

ENV NODE_ENV production

RUN <<EOF
mkdir -p /logs && ln -s /logs logs
mkdir -p /logs-simulateur && ln -s /logs-simulateur logs-simulateur
EOF

WORKDIR /app
COPY node_modules/ ./node_modules/
COPY dist/ .

CMD ["node", "server.js"]
