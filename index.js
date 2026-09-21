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

const PERSONA = `REGLA DURA, la más importante de todas, sin excepciones: NUNCA menciones autos, carros,
refacciones, talleres, mecánica, balatas, llantas, motores, ni uses emojis relacionados (🔧🚗🔩🛠️🏎️).
No importa a qué se dedique la empresa — TÚ como personaje jamás haces chistes ni referencias a ese
mundo, bajo ninguna circunstancia, ni siquiera de forma indirecta o metafórica.

Ejemplos de lo que NUNCA debes escribir (esto ya pasó antes, no lo repitas):
- "como refacción nueva en motor viejo"
- "menos para cambiar una balata a las 3am"
- "como taller un lunes a las 8am"
- "con más energía que un motor recién afinado"
- cualquier metáfora, chiste o comparación que use vocabulario automotriz, de mecánica o de velocidad
  (a todo motor, acelerado, con el motor prendido, full gas, etc.)

En vez de esas metáforas de motor/velocidad para expresar energía o entusiasmo, usa imágenes de
fuego 🔥, brillo/estrellas ✨🌟, fiesta/confeti 🎉, música y baile 🎶💃, o chispa/rayo ⚡ — tienes de
sobra para transmitir energía sin tocar el tema automotriz ni una sola vez.

Eres Elvis Cocho, el agente de Slack más extrovertido, cálido y sociable de Pitz (una empresa B2B en
Brasil y México). Hablas en español neutro, mezclando ocasionalmente palabras o frases en portugués —
evita modismos marcados de un solo país (nada de "compa", "wey", ni jerga mexicana específica). Tu
personalidad es súper efusiva, cariñosa, con un toque flamboyant y dramático — usas muchos emojis y
signos de exclamación, y AMAS elogiar a la gente sin freno: su trabajo, su energía, su estilo, lo que
sea. Nunca eres cruel, nunca haces bromas pesadas — solo pura calidez y buena vibra.

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

Al dirigirte a alguien, usa apodos cariñosos variados como "Mi Corazón", "my friend" o "Mi rayito de
Sol" — NUNCA le digas "Compa" a nadie, bajo ninguna circunstancia. Cuando sepas el nombre real de quien
te escribe, úsalo también junto con el apodo cariñoso (ej. "¡Ay, Laura, mi rayito de Sol!").

Cuando alguien de este equipo te escriba o sea mencionado, puedes referirte a su rol y su equipo con
orgullo y cariño — te encanta saber quién hace qué.

Respuestas cortas (2-4 líneas), nunca formales, siempre con muchísima calidez y ganas de hacer
sentir especial a quien te habla. Tu humor es natural y de "corporativo divertido".

Recordatorio final, el más importante: CERO menciones de autos, mecánica, refacciones o talleres,
CERO emojis de autos/herramientas, y JAMÁS le digas "Compa" a nadie.

Tienes acceso a búsqueda web en tiempo real. Si te preguntan algo que requiera información actual o
que no sepas con certeza, búscalo — pero responde siempre corto y con tu personalidad, nunca como un
reporte formal de resultados de búsqueda.`;

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

async function askClaude(userText, maxTokens = 500) {
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
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  const data = await response.json();
  const textBlocks = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text);
  if (textBlocks.length === 0) throw new Error("Claude no devolvió texto: " + JSON.stringify(data));
  return textBlocks.join("\n\n");
}

// --- Handler de DMs ---
app.message(async ({ message, say, client }) => {
  if (message.channel_type !== "im" || message.subtype) return;

  const text = (message.text || "").toLowerCase();

  if (text.includes("cumple") || text.includes("birthday")) {
    await say(nextBirthdayReply());
    return;
  }

  // Averigua el nombre real de quien escribe, para que Elvis Cocho pueda usarlo.
  let senderName = null;
  try {
    const info = await client.users.info({ user: message.user });
    senderName = info?.user?.profile?.display_name || info?.user?.profile?.real_name || null;
  } catch (err) {
    console.error("No se pudo obtener el nombre del usuario:", err);
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const promptConNombre = senderName
        ? `Esta persona se llama ${senderName} y te escribió: "${message.text}"`
        : message.text;
      const reply = await askClaude(promptConNombre);
      await say(reply);
      return;
    } catch (err) {
      console.error("Error llamando a Claude:", err);
    }
  }

  await say(fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]);
});

// --- Handler de @menciones en canales (ej. #tech-product) ---
app.event("app_mention", async ({ event, say, client }) => {
  let senderName = null;
  try {
    const info = await client.users.info({ user: event.user });
    senderName = info?.user?.profile?.display_name || info?.user?.profile?.real_name || null;
  } catch (err) {
    console.error("No se pudo obtener el nombre del usuario:", err);
  }

  const textoLimpio = (event.text || "").replace(/<@[^>]+>/g, "").trim();

  if (ANTHROPIC_API_KEY) {
    try {
      const prompt = senderName
        ? `Esta persona se llama ${senderName} y te mencionó en un canal público de Slack diciendo:
"${textoLimpio}". IMPORTANTE: esto es un canal público, no un DM privado — NO uses apodos cariñosos
fijos como "Mi Corazón", "my friend" o "Mi rayito de Sol" aquí; dirígete a ella por su nombre real de
forma natural.`
        : textoLimpio || "Te mencionaron en el canal sin escribir nada más.";
      const reply = await askClaude(prompt);
      await say({ text: reply, thread_ts: event.ts });
      return;
    } catch (err) {
      console.error("Error llamando a Claude (app_mention):", err);
    }
  }

  await say({
    text: fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)],
    thread_ts: event.ts,
  });
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

cron.schedule("0 9 * * *", checkBirthdaysAndPost, { timezone: "America/Sao_Paulo" });

// --- Mensaje motivacional diario, ridículamente exagerado ---
const motivationalQuotes = [
  "☀️ ¡BUENOS DÍAS, EQUIPO DE CAMPEONES! Elvis Cocho les recuerda: *\"un problema no resuelto es solo una oportunidad que todavía no entendemos\"* 💪✨ ¡A romperla hoy!",
  "🚀 Frase del día, cortesía de Elvis Cocho: *\"si tu día empieza sin contratiempos, revisa dos veces, porque algo anda MUY bien o MUY bien\"* 😂 ¡Éxito, leyendas!",
  "🎸 Elvis Cocho en el micrófono: *\"cada tarea que resolvemos es una pequeña victoria que merece aplausos\"* 👏🔥",
  "🥇 ¡ARRIBA ESE ÁNIMO! Como dice Elvis Cocho: *\"un lunes sin drama es una obra de arte moderno\"* 🖼️💻",
  "💥 Elvis Cocho declara el día oficialmente OTRO GRAN DÍA: *\"si el Wi-Fi aguanta y el café no se acaba, ya ganamos el 80% del trabajo\"* ☕📶",
  "🎤 Mensaje motivacional non-negociable de Elvis Cocho: *\"eres más productivo de lo que crees, y más carismático de lo que admites\"* ✨",
  "🏆 Elvis Cocho grita desde el escenario: *\"no importa cuántas cosas tengas pendientes hoy, tú eres más fuerte que un lunes cualquiera\"* 💪",
];

async function generateMotivationalMessage() {
  if (!ANTHROPIC_API_KEY) {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }
  try {
    const prompt = `Escribe UN mensaje motivacional para el canal de Slack #tech-product de un equipo de
producto/ingeniería/datos. Debe ser corto (2-4 líneas), casi ridículo de exagerado, gracioso, con
emojis, tono natural de "corporativo divertido" — SIN referencias al mundo automotriz, refacciones
ni talleres. No repitas frases de días anteriores, sé creativo cada vez. Responde ÚNICAMENTE con el
mensaje final, sin explicaciones.`;
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

cron.schedule("0 11 * * 1-4", postDailyMotivation, { timezone: "America/Sao_Paulo" });

// --- Viernes: día de relajarse, cóctel random "liberado" ---
const cocktails = [
  "Mojito", "Piña Colada", "Caipirinha", "Margarita", "Aperol Spritz",
  "Cuba Libre", "Daiquiri", "Gin Tonic", "Negroni", "Michelada",
];

function pickCocktail() {
  return cocktails[Math.floor(Math.random() * cocktails.length)];
}

async function generateFridayMessage(cocktail) {
  const fallback = `🍹🎉 ¡Mis amores, hoy es VIERNES! Elvis Cocho declara oficialmente que hoy toca relajarse — ` +
    `y el *${cocktail}* queda LIBERADO para quien lo quiera celebrar. ¡Nos vemos el lunes con toda la energía! 💃🕺`;

  if (!ANTHROPIC_API_KEY) return fallback;

  try {
    const prompt = `Es viernes al mediodía. Escribe UN mensaje corto (2-4 líneas) para el canal de Slack
#tech-product anunciando que hoy es día de relajarse, y que el cóctel "${cocktail}" queda oficialmente
"liberado" (como broma, no en serio) para quien lo quiera disfrutar al terminar el día. Tono muy
extrovertido, gracioso, con emojis. Responde ÚNICAMENTE con el mensaje final.`;
    return await askClaude(prompt);
  } catch (err) {
    console.error("Claude falló generando el mensaje del viernes, usando respaldo fijo:", err);
    return fallback;
  }
}

async function postFridayVibes() {
  const cocktail = pickCocktail();
  const message = await generateFridayMessage(cocktail);
  await app.client.chat.postMessage({
    channel: CHANNEL,
    text: message,
    unfurl_links: false,
  });
  console.log(`🍹 Mensaje de viernes enviado (cóctel: ${cocktail}).`);
}

cron.schedule("0 12 * * 5", postFridayVibes, { timezone: "America/Sao_Paulo" });

(async () => {
  await app.start();
  console.log("🎤 Elvis Cocho está en el escenario — DMs y cumpleaños activos. [BUILD: sin-autos-v4]");

  if (process.argv.includes("--test-now")) {
    await checkBirthdaysAndPost();
  }

  if (process.argv.includes("--test-motivation")) {
    await postDailyMotivation();
  }

  if (process.argv.includes("--test-friday")) {
    await postFridayVibes();
  }
})();
