FROM node:10-alpine

RUN apk add --update --no-cache openssh sshpass

EXPOSE 4100

ENV NODE_ENV dev

RUN mkdir -p /app

WORKDIR /app

COPY . .

RUN npm install \
    && npm run build \
    && npm cache clean --force \
    && rm -rf ~/.npm \
    && rm -rf /tmp/npm*

CMD ["node", "dist/server.js"]
