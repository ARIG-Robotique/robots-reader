FROM node:13-alpine as builder

ENV NODE_ENV dev
WORKDIR /build

COPY . .

RUN yarn install
RUN yarn build

# Image finale #
# ------------ #
FROM node:13-alpine as final

RUN mkdir -p /logs/simulateur
VOLUME /logs/simulateur

RUN apk add --update --no-cache openssh sshpass

EXPOSE 4100

ENV NODE_ENV production

WORKDIR /app
COPY --from=builder /build/dist/ .
COPY yarn.lock .

RUN yarn install && yarn cache clean --force

CMD ["node", "server.js"]
