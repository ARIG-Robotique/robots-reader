FROM node:13-alpine

RUN apk add --update --no-cache openssh sshpass

EXPOSE 4100

ENV NODE_ENV dev

WORKDIR /app

RUN mkdir -p logs/simulateur

VOLUME /app/logs/simulateur

COPY . .

RUN yarn install \
    && yarn build \
    && yarn cache clean --force

CMD ["node", "dist/server.js"]
