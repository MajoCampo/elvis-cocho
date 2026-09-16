FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js birthdays.json ./

# Socket Mode = conexión saliente, no necesita exponer ningún puerto.
CMD ["node", "index.js"]
