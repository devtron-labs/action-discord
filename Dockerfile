FROM mhart/alpine-node:12.19.1

ENV DISCORD_USERNAME  "devtron notifier"
ENV DISCORD_AVATAR  "https://github.com/devtron-labs/devtron/raw/main/assets/devtron-darkmode-logo.png"
ADD package.json package-lock.json /
RUN npm install
ADD entrypoint.js /
RUN chmod +x /entrypoint.js

ENTRYPOINT ["node", "/entrypoint.js"]
