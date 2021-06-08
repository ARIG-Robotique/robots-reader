FROM node:14-alpine as builder

ENV NODE_ENV dev
WORKDIR /build

COPY . .

RUN yarn install
RUN yarn build

# Image finale #
# ------------ #
FROM node:14-alpine as final

RUN apk add --update --no-cache openssh sshpass

EXPOSE 4100

ENV NODE_ENV production

WORKDIR /app
COPY --from=builder /build/dist/ .
COPY yarn.lock .

RUN yarn install && yarn cache clean --force

CMD ["node", "server.js"]
