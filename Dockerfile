FROM node:16-alpine as builder

ENV NODE_ENV dev
WORKDIR /build

COPY . .

RUN <<EOF
yarn install
yarn build
EOF

# Image finale #
# ------------ #
FROM node:16-alpine as final

RUN apk add --update --no-cache openssh

EXPOSE 4100

ENV NODE_ENV production

WORKDIR /app
RUN <<EOF
mkdir -p /logs && ln -s /logs logs
mkdir -p /logs-simulateur && ln -s /logs-simulateur logs-simulateur
EOF

COPY --from=builder /build/dist/ .
COPY yarn.lock .

RUN yarn install && yarn cache clean --force

CMD ["node", "server.js"]
