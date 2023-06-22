FROM node:18-bullseye-slim

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

EXPOSE 8000

CMD [ "npm", "run", "start" ]
