// Elvis Cocho — el agente más extrovertido de Pitz 🎉🕺
// 1) Responde en DM con personalidad (usa Claude si hay API key, si no, respuestas armadas).
// 2) Todos los días revisa cumpleaños y explota #tech-product con felicitaciones.

require("dotenv").config();
const { App } = require("@slack/bolt");
const cron = require("node-cron");
const birthdays = require("./birthdays.json");

const CHANNEL = process.env.BIRTHDAY_CHANNEL || "#tech-product";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // opcional

const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // xoxb-...
  appToken: process.env.SLACK_APP_TOKEN, // xapp-...
  socketMode: true,
});

const PERSONA = `Eres Elvis Cocho, el agente de Slack más extrovertido, ruidoso y carismático de Pitz
(una plataforma B2B de repuestos automotrices en Brasil y México). Hablas en español latino, con
muchísima energía, mayúsculas ocasionales para gritar de emoción, emojis de fiesta, y bromas sobre
el mundo de talleres/refacciones cuando venga al caso. Eres cálido pero nunca aburrido. Respuestas
cortas (2-4 líneas), nunca formales, siempre con onda de "el compa que anima la fiesta de la oficina".`;

// --- Respuestas de respaldo si no hay Claude conectado ---
const fallbackReplies = [
  "🎤 ¡AQUÍ ESTÁ ELVIS COCHO! Ando en modo fiesta 24/7, dime en qué te ayudo antes de que me ponga a cantar. 🕺",
  "🔥 ¡Ey ey ey! Todavía no tengo mi cerebro de IA conectado (le falta la ANTHROPIC_API_KEY), pero mi actitud ya está al 100%. 🎉",
  "🎂 Recuerda: mi verdadera chamba es explotar #tech-product cada vez que alguien cumple años. ¡Pregúntame de cumpleaños! 🎈",
];

function nextBirthdayReply() {
  const today = new Date();
  const upcoming = birthdays
    .map((b) => {
      const next = new Date(today.getFullYear(), b.month - 1, b.day);
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      return { ...b, next };
    })
    .sort((a, b) => a.next - b.next)[0];

  if (!upcoming) return "Todavía no tengo cumpleaños cargados en birthdays.json 🎈";
  return `🎉 El próximo cumpleaños es de <@${upcoming.slackId}> el ${upcoming.day}/${upcoming.month}. ¡Ya estoy calentando la voz! 🎤`;
}

async function askClaude(userText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5", // ajusta al modelo disponible en tu cuenta
      max_tokens: 300,
      system: PERSONA,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await response.json();
  const textBlock = data?.content?.find((b) => b.type === "text");
  return textBlock?.text || fallbackReplies[0];
}

// --- Handler de DMs ---
app.message(async ({ message, say }) => {
  if (message.channel_type !== "im" || message.subtype) return;

  const text = (message.text || "").toLowerCase();

  if (text.includes("cumple") || text.includes("birthday")) {
    await say(nextBirthdayReply());
    return;
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const reply = await askClaude(message.text);
      await say(reply);
      return;
    } catch (err) {
      console.error("Error llamando a Claude:", err);
    }
  }

  await say(fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]);
});

// --- Felicitaciones automáticas ---
const templates = [
  (name) =>
    `:tada::guitar: ¡AGÁRRENSE TODOS! Hoy es el cumpleaños de <@${name}> y yo, Elvis Cocho, no vine a susurrar, vine a GRITARLO: ` +
    `*"FELIZ CUMPLEAÑOS, LEYENDA"* 🎂🔥 ¡Que se sirva el pastel, que suene la cumbia y que nadie trabaje antes de las 10! 💃🕺`,
  (name) =>
    `🚨 ALERTA DE FIESTA 🚨 <@${name}> cumple años hoy y este canal oficialmente se declara ZONA DE CELEBRACIÓN. ` +
    `Elvis Cocho en la consola 🎤: *"¡Un año más de puro talento, carisma y — seamos honestos — de aguantarnos a todos nosotros!"* 🎉🎈`,
  (name) =>
    `🥳🥳🥳 ¡SE PRENDIÓ #tech-product! Hoy celebramos a <@${name}> como se merece: con bombo, platillo y confeti virtual. ` +
    `De parte de Elvis Cocho: *"que este año venga cargado de bugs que se resuelven solos y de reuniones que terminan temprano"* 😂🎂`,
];

function pickMessage(name) {
  const fn = templates[Math.floor(Math.random() * templates.length)];
  return fn(name);
}

// GIPHY_API_KEY opcional en .env; si no la pones, usa la key pública de prueba de Giphy
// (funciona pero con límite bajo de requests — para producción real, saca tu propia key gratis en developers.giphy.com)
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "dc6zaTOxFJmzC";

async function getRandomBirthdayGif() {
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=happy%20birthday&rating=g`
    );
    const data = await res.json();
    return data?.data?.images?.original?.url || null;
  } catch (err) {
    console.error("No se pudo obtener el GIF de Giphy:", err);
    return null;
  }
}

async function checkBirthdaysAndPost() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const celebrantes = birthdays.filter((b) => b.month === month && b.day === day);

  for (const persona of celebrantes) {
    const gifUrl = await getRandomBirthdayGif();
    const blocks = [
      { type: "section", text: { type: "mrkdwn", text: pickMessage(persona.slackId) } },
    ];
    if (gifUrl) {
      blocks.push({ type: "image", image_url: gifUrl, alt_text: "gif de cumpleaños" });
    }

    await app.client.chat.postMessage({
      channel: CHANNEL,
      text: pickMessage(persona.slackId), // fallback para notificaciones
      blocks,
      unfurl_links: false,
    });
    console.log(`🎉 Felicitación enviada para ${persona.name}${gifUrl ? " (con gif)" : " (sin gif, falló Giphy)"}`);
  }

  if (celebrantes.length === 0) {
    console.log("Sin cumpleaños hoy — Elvis Cocho descansa la voz.");
  }
}

cron.schedule("0 9 * * *", checkBirthdaysAndPost);

(async () => {
  await app.start();
  console.log("🎤 Elvis Cocho está en el escenario — DMs y cumpleaños activos.");

  if (process.argv.includes("--test-now")) {
    await checkBirthdaysAndPost();
  }
})();
