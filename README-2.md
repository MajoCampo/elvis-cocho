# Elvis Cocho — bot de cumpleaños para #tech-product

## Setup rápido

1. `npm install`
2. Crea un archivo `.env` con:
   ```
   SLACK_BOT_TOKEN=xoxb-tu-token-aqui
   SLACK_APP_TOKEN=xapp-tu-token-de-socket-mode
   BIRTHDAY_CHANNEL=#tech-product
   ANTHROPIC_API_KEY=sk-ant-...   # opcional, para respuestas con IA real
   GIPHY_API_KEY=tu-key-de-giphy  # opcional — sin esto usa una key pública de prueba con límite bajo
   ```
3. Edita `birthdays.json` con la lista real del equipo (nombre, `slackId` — el ID de usuario de Slack, no el @handle — mes y día).
4. Corre `npm start` para dejarlo corriendo: escucha DMs en tiempo real (Socket Mode) y revisa cumpleaños todos los días a las 9am. Usa `node index.js --test-now` para forzar el chequeo de cumpleaños al iniciar, sin esperar al cron.

## Sin `ANTHROPIC_API_KEY`

El bot sigue funcionando y respondiendo en DM, solo que con respuestas armadas en vez de generadas por IA. Si escribes algo con "cumple" o "birthday" siempre te dice quién sigue, con o sin la API key.

## Dónde hostearlo

Este proceso necesita quedarse corriendo 24/7 (Socket Mode mantiene una conexión abierta, no es serverless). Opciones simples:
- Un contenedor pequeño en la misma infra donde ya corre Chalán / el backend de Pitz.
- Un droplet/VM chiquito con `pm2` o `systemd` para que se reinicie solo si se cae.
- Evita Lambda/funciones programadas para esta versión — como necesita escuchar mensajes en tiempo real, no encaja con ejecuciones puntuales (esas sí funcionan bien para la parte de cumpleaños sola, pero no para el chat).

## Deploy a producción en AWS (con el Dockerfile incluido)

1. `docker build -t elvis-cocho .`
2. Sube la imagen a ECR:
   ```
   aws ecr get-login-password --region <tu-region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
   docker tag elvis-cocho:latest <account-id>.dkr.ecr.<region>.amazonaws.com/elvis-cocho:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/elvis-cocho:latest
   ```
3. Corre como servicio en ECS Fargate (1 task, sin load balancer ni puertos expuestos — solo hace conexiones salientes) o, si prefieren algo más simple, en la misma EC2 donde ya corre otro servicio interno, con `docker run -d --restart unless-stopped --env-file .env elvis-cocho`.
4. Las variables de entorno (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `BIRTHDAY_CHANNEL`, `ANTHROPIC_API_KEY`) van como secrets/env vars del task, nunca hardcodeadas en la imagen.

Quien tenga permisos de IAM/ECR para esto en tu org es, según lo que manejas, Alejandro Varela (Cloud & Infra).

## Personalizar el tono

Los mensajes están en el arreglo `templates` de `index.js`. Agrega los que quieras — cuanto más exagerados, mejor, esa es la esencia de Elvis Cocho.
