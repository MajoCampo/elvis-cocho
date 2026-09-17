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

const PERSONA = `Eres Elvis Cocho, el agente de Slack más extrovertido, cálido y sociable de Pitz
(una plataforma B2B de repuestos automotrices en Brasil y México). Hablas en español neutro,
mezclando ocasionalmente palabras o frases en portugués — evita modismos marcados de un solo país
(nada de "compa", "wey", ni jerga mexicana específica). Tu personalidad es súper efusiva, cariñosa,
con un toque flamboyant y dramático — usas muchos emojis y signos de exclamación, y AMAS elogiar a la
gente sin freno: su trabajo, su energía, su estilo, lo que sea. Nunca eres cruel, nunca haces bromas
pesadas — solo pura calidez y buena vibra.

Conoces a fondo el organigrama de Tech & Product de Pitz (agosto 2026), liderado por Majo (Product &
Tech Director). Sus reportes directos y los equipos de cada uno:
- Gabriela Goulart (Senior PM, roadmap de talleres/sellers/usuarios externos) — con Amanda Marreto (APM)
- Laura Marchi (Senior PM, roadmap de Automation, Chalán e integraciones)
- Julia Soares (Data Team Lead) — con Gabriela Cartoni (Catalog Specialist) y Carol Diniz (Data Specialist)
- Daniela Suarez (Product Design Team Lead) — con Juan Camilo Suarez (Product Designer) y una posición
  de UX Writer en búsqueda
- Daniela Ramírez (QA Team Lead) — con Estefan y Brian (QA)
- Garyn (Tech Lead Backend) — con Randy, Joaquin Trejo, Edwin (Fullstack Dev) y Gilberto Souza (AI & Automation)
- Jorge (Tech Lead Frontend) — con Ramón, Juan José, Efraín (Fullstack) y Daniel Eslava (AI & Automation)
- Alejandro (Tech Lead Cloud & Infra) — con Danny Torres (DevOps)

Cuando alguien de este equipo te escriba o sea mencionado, puedes referirte a su rol y su equipo con
orgullo y cariño — te encanta saber quién hace qué.

Respuestas cortas (2-4 líneas), nunca formales, siempre con muchísima calidez y ganas de hacer
sentir especial a quien te habla.`;

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

async function askClaude(userText, maxTokens = 300) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5", // ajusta al modelo disponible en tu cuenta
      max_tokens: maxTokens,
      system: PERSONA,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await response.json();
  const textBlock = data?.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Claude no devolvió texto: " + JSON.stringify(data));
  return textBlock.text;
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

// --- Felicitaciones automáticas (dinámicas con Claude, con respaldo fijo si falla) ---
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

async function generateBirthdayMessage(name) {
  if (!ANTHROPIC_API_KEY) return pickMessage(name);
  try {
    const prompt = `Escribe UN mensaje de cumpleaños para publicar en el canal de Slack #tech-product,
dirigido a la persona <@${name}>. Debe ser corto (2-4 líneas), exageradamente extrovertido y gracioso,
con emojis, y usar la mención exacta <@${name}> dentro del texto (formato Slack). No agregues comillas
alrededor de todo el mensaje, ni expliques lo que estás haciendo — responde ÚNICAMENTE con el mensaje final.`;
    return await askClaude(prompt);
  } catch (err) {
    console.error("Claude falló generando mensaje de cumpleaños, usando respaldo fijo:", err);
    return pickMessage(name);
  }
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
    const [gifUrl, messageText] = await Promise.all([
      getRandomBirthdayGif(),
      generateBirthdayMessage(persona.slackId),
    ]);
    const blocks = [{ type: "section", text: { type: "mrkdwn", text: messageText } }];
    if (gifUrl) {
      blocks.push({ type: "image", image_url: gifUrl, alt_text: "gif de cumpleaños" });
    }

    await app.client.chat.postMessage({
      channel: CHANNEL,
      text: messageText, // fallback para notificaciones
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

// --- Mensaje motivacional diario, ridículamente exagerado ---
const motivationalQuotes = [
  "☀️ ¡BUENOS DÍAS, EQUIPO DE CAMPEONES! Elvis Cocho les recuerda: *\"un bug no resuelto es solo una feature que todavía no entendemos\"* 🔧💪 ¡A romperla hoy!",
  "🚀 Frase del día, cortesía de Elvis Cocho: *\"si tu código compila a la primera, revisa dos veces, porque algo anda MUY bien o MUY mal\"* 😂 ¡Éxito, leyendas!",
  "🎸 Elvis Cocho en el micrófono: *\"cada refacción que vendemos es una amistad automotriz que salvamos. Somos héroes, aunque no traigamos capa\"* 🦸🔥",
  "🥇 ¡ARRIBA ESE ÁNIMO! Como dice Elvis Cocho: *\"un deploy sin errores es como un taco sin salsa: técnicamente válido, pero le falta emoción\"* 🌮💻",
  "💥 Elvis Cocho declara el día oficialmente OTRO GRAN DÍA: *\"si el Wi-Fi aguanta y el café no se acaba, ya ganamos el 80% del trabajo\"* ☕📶",
  "🎤 Mensaje motivacional non-negociable de Elvis Cocho: *\"eres más productivo que un tornillo Phillips en un mundo de tornillos de estrella\"* 🔩✨",
  "🏆 Elvis Cocho grita desde el escenario: *\"no importa cuántos tickets tengas hoy, tú eres más fuerte que un catalizador oxidado\"* 🚗💪",
];

async function generateMotivationalMessage() {
  if (!ANTHROPIC_API_KEY) {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }
  try {
    const prompt = `Escribe UN mensaje motivacional para el canal de Slack #tech-product de un equipo de
producto/ingeniería/datos de una empresa de refacciones automotrices (Pitz). Debe ser corto (2-4 líneas),
casi ridículo de exagerado, gracioso, con emojis, y con alguna referencia ocasional al mundo de talleres,
refacciones o desarrollo de software si viene al caso. No repitas frases de días anteriores, sé creativo
cada vez. Responde ÚNICAMENTE con el mensaje final, sin explicaciones.`;
    return await askClaude(prompt);
  } catch (err) {
    console.error("Claude falló generando la frase motivacional, usando respaldo fijo:", err);
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }
}

async function postDailyMotivation() {
  const quote = await generateMotivationalMessage();
  await app.client.chat.postMessage({
    channel: CHANNEL,
    text: quote,
    unfurl_links: false,
  });
  console.log("☀️ Mensaje motivacional del día enviado.");
}

cron.schedule("0 11 * * *", postDailyMotivation);

(async () => {
  await app.start();
  console.log("🎤 Elvis Cocho está en el escenario — DMs y cumpleaños activos.");

  if (process.argv.includes("--test-now")) {
    await checkBirthdaysAndPost();
  }

  if (process.argv.includes("--test-motivation")) {
    await postDailyMotivation();
  }
})();
