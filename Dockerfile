FROM node:18-bullseye-slim

WORKDIR /app

COPY . .

RUN npm install -g typescript && npm install & npm run build

EXPOSE 3000

CMD [ "npm", "run", "start" ]
