FROM node:alpine

WORKDIR /usr/src/app

COPY . /usr/src/app

ENV PORT=4220

ENV DATABASE="mongodb://root:somepassword@mongodb:27017"

RUN npm install

RUN npm run build

CMD ["npm", "start"]
