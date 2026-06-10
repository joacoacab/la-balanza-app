FROM node:20-alpine

WORKDIR /app

# Ejecutar como usuario node (uid 1000) para que los archivos generados dentro
# del contenedor (incluyendo dist/) coincidan con el propietario del host en
# instalaciones Ubuntu estándar donde el primer usuario es uid 1000.
COPY --chown=node:node package.json ./
RUN npm install

USER node

EXPOSE 5173

CMD ["npm", "run", "dev"]
