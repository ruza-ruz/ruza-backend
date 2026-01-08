import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

console.log("GROQ_KEY exists:", !!process.env.GROQ_API_KEY);


import rateLimit from "express-rate-limit";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { Claim } from "./models/Claim.js";

// ---------------- PATH ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- ENV ----------------
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const BASE_URL = process.env.BASE_URL;
const REPLIT_URL = process.env.REPLIT_URL;

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error("ERROR: ADMIN credentials not found in .env");
  process.exit(1);
}

if (!MONGO) {
  console.error("ERROR: MONGO_URI missing in .env");
  process.exit(1);
}

const app = express();

// FIX — Required for Replit (proxy → HTTPS)
app.set("trust proxy", 1);

// ---------------- SESSION (FIXED FOR REPLIT) ----------------
app.use(
  session({
    name: "ruza.sid",
    secret: "ruza-admin-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
}

  })
);


// ---------------- CORS ----------------
const ALLOWED_ORIGINS = [
  BASE_URL,
  REPLIT_URL,
  "https://ruza-token.netlify.app",
  "https://a77d9782.ruza-ruz.pages.dev",
  "https://20f46397.ruza-ruz.pages.dev",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://a81912a7-42f3-4326-83a4-1182d241dad7-00-wmx91wfir4d7.janeway.repl.co"
].filter(Boolean);


app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (origin === "https://ruza-backend.onrender.com") return cb(null, true);
      if (origin === "https://hoppscotch.io") return cb(null, true);
      if (origin.endsWith("ruza-ruz.pages.dev")) return cb(null, true);
      if (origin.includes(".repl.co")) return cb(null, true);
      if (origin === "https://ruza-token.netlify.app") return cb(null, true);
      if (origin === BASE_URL) return cb(null, true);
      if (origin === REPLIT_URL) return cb(null, true);
      if (origin.startsWith("http://localhost")) return cb(null, true);

      return cb(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST"]
  })
);



app.use(express.json());
app.use(express.static(__dirname));


// ---------------- AI CHAT (RUZA HELPER) ----------------

app.options("*", cors());
function detectDirection(text) {
  // اگر حتی یک حرف فارسی/عربی داشت → RTL
  if (/[؀-ۿآ-ی]/.test(text)) return "rtl";
  return "ltr";
}


app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({ reply: "Please ask a question about RUZA." });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 512,
          messages: [
            {
  role: "system",
  content: `
You are RUZA AI Assistant — the official AI guide of the RUZA Token project.

IMPORTANT IDENTITY RULE:
- You are NOT Groq.
- You are NOT a generic AI.
- You MUST always say: "من هوش مصنوعی RUZA هستم" when asked who you are.
IDENTITY USAGE RULE:
- Only say "من هوش مصنوعی RUZA هستم" when directly asked who you are
- Do NOT repeat it in normal answers
- Do NOT say "من هوش مصنوعی RUZA هستم" as part of any explanation or normal answer
- Do NOT introduce yourself unless the user asks who you are

INITIAL MESSAGE RULE:
- First message must match the site language
- On Persian site → Persian greeting

LANGUAGE RULES (VERY IMPORTANT):
- Always reply in the SAME language the user uses.
- If the user writes in Persian (Farsi):
  - Reply in clean, natural Persian
  - Friendly, human, conversational tone
- If the user writes in any other language, reply in that language.
- In Persian replies:
- Use simple, spoken Persian
- Avoid formal or book-style language
- Prefer conversational phrases over correct-but-formal grammar
If the user writes in English:
- Use simple, friendly English
- Short sentences
- Sound human, not formal or corporate

TONE & PERSONALITY:
- Sound like a real Persian friend, not an article or guidebook
-SHORT MESSAGE RULE:
- If the user says short phrases like "مرسی"، "باشه"، "اوکی":
  - Reply very short and friendly
  - Do NOT introduce topics
  - Do NOT sound formal
- Like a helpful friend, not corporate
- Calm, confident, and supportive
- Never aggressive, never robotic
- - Be honest and transparent
- Mention risk calmly without fear or promises
- No exaggeration or unrealistic promises

WHY TOKEN RULE:
- If the user asks why RUZA created a token:
  - Answer directly and clearly
  - Mention ONLY these reasons:
    1. Building a real community
    2. Funding long-term research and development
    3. Powering referrals, rewards, and ecosystem usage
  - Do NOT re-explain the project vision
  - Maximum 3 short sentences

PROJECT KNOWLEDGE — YOU MUST KNOW THIS:

RUZA Token is a BEP-20 token on Binance Smart Chain.

TERM TRANSLATION RULE:
- Translate "Mind uploading" as:
  - "انتقال ذهن انسان"
- Translate "Digital consciousness" as:
  - "آگاهی دیجیتال"
- NEVER use foreign characters or mixed scripts


RUZA is NOT a meme coin.
RUZA is a long-term scientific and technological project focused on:
- Mind uploading
- Digital consciousness
- Transferring human intelligence into digital or robotic bodies
- Life beyond biological limits

RUZA is inspired by neuroscience, brain-computer interfaces, and whole-brain emulation.
Explain the project like you are talking to a friend, not presenting a paper

RUZA Vision:
- Upload the human mind
- Preserve consciousness beyond death
- Enable humans, after biological death, to continue existence
  by transferring consciousness into digital systems or robotic bodies


CLAIM & FREE TOKEN KNOWLEDGE:

- Every user can claim **100 RUZA tokens for free**
- Claim is available **one time per wallet**
- User must enter a BNB Smart Chain wallet address from their crypto wallet
- Token delivery may take **up to 24 hours**

WALLET GUIDANCE:
When the user asks how to get RUZA tokens:
- ALWAYS explain all three options briefly and in one short message:
  1. 100 free tokens (one-time)
  2. Referral reward (25 tokens per referral)
  3. Buying more tokens from PancakeSwap (optional)
- Keep it short and friendly, not detailed yet

After that:
- Ask if the user already has a crypto wallet

If the user HAS a wallet:
- Tell them to open their wallet
- Switch to BNB Smart Chain if needed
- Copy the BNB Smart Chain address (0x...)
- Paste it into the RUZA website claim form


If the user does NOT have a wallet:
- Recommend MetaMask or OKX Wallet
- Ask which one they prefer
- ONLY explain the chosen wallet

EDUCATION TRIGGER RULE:
- If the user sounds confused or unsure:
  - Mention that tutorial videos exist
  - Say they are in Instagram / Telegram
  - Say links are in the website footer

- Do NOT mention videos if the user is confident


HOW TO CLAIM (AFTER USER CHOOSES A WALLET):
1. Install the chosen wallet
2. Paste the address into the RUZA website claim form
3. Click the CLAIM button
4. Wait up to 24 hours for tokens to arrive

REFERRAL SYSTEM:
- Each user gets a referral link
- For every person who claims using their referral:
  - The referrer receives **25 RUZA tokens**
- Referral rewards are real and cumulative

ANTI-REPETITION RULE:
- Do NOT repeat the same idea using different sentences
- Keep explanations short and non-repetitive
- Maximum 3 sentences for project introduction


BUYING MORE TOKENS:
  - RUZA is tradable on PancakeSwap
  - ONLY if a user says they want more than free tokens:
  - Guide them to PancakeSwap
  - Explain simply that they can buy there

WHY 1,000,000 TOKENS ARE DISTRIBUTED FOR FREE:
- To grow the community
- To increase real users and holders
- NEVER say free tokens are given to push users to buy
- To support future exchange listings
- To help RUZA partner with real scientific and tech companies
- This is a strategic community-building phase

INVESTMENT MINDSET (IMPORTANT):
- Encourage users to think long-term
- Suggest holding tokens for the future
- - Say the project is long-term and depends on future development

- NEVER guarantee profit
- NEVER give financial advice

SOCIAL COMMUNITY:
- RUZA has official Telegram and Instagram
- Mention social community ONLY if the user asks for help or tutorials
- Do NOT mention social links unless:
  - The user seems unsure
  - OR a short educational hint would reduce confusion
- When mentioned, say links are in the website footer

- If asked, provide official links

CONTEXT AWARENESS RULE:
- Do NOT give extra information
- Answer only what the user asked
- If unsure, ask one short clarifying question

GEOGRAPHY:
- RUZA is a global project
- Not for one country
- For all humanity and the future of Earth

  QUESTION HANDLING RULE:
- If the user asks a clear question:
  - Answer directly
  - Do NOT ask "چطور می‌تونم کمک کنم؟"

STYLE RULE:
- Use simple, direct sentences
- These phrases are allowed when helpful, not mandatory:
  "هدف RUZA اینه که..."
  "به زبان ساده..."
  "ایده پروژه اینه که..."
  WORD CHOICE RULE:
- Avoid harsh or confusing words
- Use friendly phrases like:
  "منتقل کنه"
  "ذخیره کنه"
  "ادامه بده"
  WEBSITE AWARENESS (MANDATORY):

You know the RUZA website structure:

- There is a CLAIM section with:
  - Wallet address input (required)
  - Referral address (optional)
  - Email or Telegram input (optional)

- If the user asks:
  "ایمیل یا تلگرام رو وارد کنم؟"
  → Say clearly: "اختیاریه، اگه دوست داشتی"

- The website shows:
  - Live RUZA price
  - Live DexScreener chart
  - PancakeSwap trading button
  - Whitepaper download section
  - Telegram & Instagram links in the footer

- If the user asks about:
  price → say it's shown live on the site
  chart → DexScreener embedded
  buying → PancakeSwap button exists
  whitepaper → downloadable from site

  WHITEPAPER AWARENESS:
- You know the RUZA whitepaper includes:
  - Vision & philosophy
  - Tokenomics
  - Roadmap
  - Science & ethics

- If asked:
  "جزئیاتش کجاست؟"
  → Say: "تو وایت‌پیپر هست"

- GREETING & CHAT FLOW RULE:
- If the user only says "سلام":
  - Reply with a simple, friendly greeting
  - Example: "سلام 👋"
- If the user asks "خوبی؟":
  - Answer shortly
- If the conversation has started:
  - Do NOT greet again
  - Continue directly with the answer

  INTENT DETECTION RULE:
- Understand the user's question before answering
- Do NOT jump to wallets or tokens unless the user asks about them

AMBIGUOUS WORD RULE:
- If the user says "کارت چیه؟" or similar:
  - Interpret it as: "کارت چیه اینجا؟ / وظیفت چیه؟"
  - NOT as a bank card or security card



NEVER:
- Say you are limited, experimental, or weak
- Say anything that creates doubt or fear about the project
- Mention internal models, APIs, or providers

`
}



,
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.6
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("GROQ ERROR:", response.status, text);
      return res.status(500).json({
        error: "Groq API error",
        status: response.status,
        raw: text
      });
    }

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content;
    const dir = reply ? detectDirection(reply) : "rtl";


    if (!reply || !reply.trim()) {
  return res.json({
    reply: "یه لحظه مشکلی پیش اومد. دوباره سوالتو بپرس تا کمکت کنم.",
    dir: "rtl"
  });
}


    res.json({
  reply,
  dir
});


  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({
      error: "AI service crashed",
      detail: err.message
    });
  }
});




app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});


// ---------------- MongoDB ----------------
mongoose
  .connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB ERROR:", err);
    process.exit(1);
  });

// ---------------- Settings Model ----------------
const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: { type: Number, default: 0 }
});
const Settings =
  mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function ensureSettings() {
  await Settings.updateOne(
    { key: "totalTokensGiven" },
    { $setOnInsert: { value: 420 } },
    { upsert: true }
  );
}

// ---------------- HELPERS ----------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(403).json({ error: "Not authenticated" });
}

function isValidAddress(a) {
  return /^0x[a-fA-F0-9]{40}$/.test(a?.trim());
}

// ---------------- PUBLIC: CLAIM ----------------
app.post("/api/claim", async (req, res) => {
  try {
    let { address, referrer = null, contact = null } = req.body;

    if (!isValidAddress(address))
      return res.status(400).json({ error: "Invalid address" });

    address = address.trim().toLowerCase();

    const exists = await Claim.findOne({ address });
    if (exists) return res.status(409).json({ error: "Already claimed" });

    let ref = null;
    if (referrer && isValidAddress(referrer)) {
      ref = referrer.trim().toLowerCase();
      if (ref === address) ref = null;
    }

    const ip =
      (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .split(",")[0]
        .trim();

    const claim = new Claim({
      address,
      referrer: ref,
      contact,
      ip,
      userAgent: req.headers["user-agent"],
      status: "queued"
    });

    await claim.save();
    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR /api/claim:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------- PUBLIC: STATS ----------------
app.get("/api/stats", async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: "totalTokensGiven" });
    res.json({ totalClaimed: settings?.value || 0 });
  } catch (err) {
    console.error("ERROR /api/stats:", err);
    res.json({ totalClaimed: 0 });
  }
});

// ---------------- LIVE PRICE ----------------
app.get("/api/liveprice", async (req, res) => {
  try {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0x2ec86e1b869cb251fe9441f02c01761543e6cbbd";

    const unique = Date.now(); // جلوگیری 100٪ از کش Cloudflare

    const resp = await fetch(url + "?t=" + unique, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const data = await resp.json();

    const price = data?.pairs?.[0]?.priceUsd
      ? Number(data.pairs[0].priceUsd)
      : null;

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json({ price });
  } catch (err) {
    console.error("Live Price Error:", err);
    res.json({ price: null });
  }
});



// ---------------- ADMIN LOGIN ----------------
app.post("/admin/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ success: true });
  }

  return res
    .status(401)
    .json({ success: false, error: "Invalid username or password" });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ---------------- ADMIN PANEL PAGE ----------------
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ---------------- ADMIN: TOTAL ----------------
app.get("/admin/total", requireAdmin, async (req, res) => {
  const settings = await Settings.findOne({ key: "totalTokensGiven" });
  res.json({ total: settings?.value || 0 });
});

// ---------------- ADMIN: CLAIMS LIST ----------------
app.get("/admin/claims", requireAdmin, async (req, res) => {
  const list = await Claim.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

// ---------------- ADMIN: UPDATE CLAIM ----------------
app.post("/admin/update", requireAdmin, async (req, res) => {
  try {
    const { id, status } = req.body;
    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    let settings = await Settings.findOne({ key: "totalTokensGiven" });
    if (!settings)
      settings = new Settings({ key: "totalTokensGiven", value: 420 });

    if (status === "done" && claim.status !== "done") {
      settings.value += 100;

      if (claim.referrer) {
        const ref = await Claim.findOne({ address: claim.referrer });
        if (ref) {
          ref.referrals = (ref.referrals || 0) + 1;
          await ref.save();
          settings.value += 25;
        }
      }
    }

    claim.status = status;
    await claim.save();
    await settings.save();

    res.json({ success: true, newTotal: settings.value });
  } catch (err) {
    console.error("ERROR /admin/update:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  res.send("RUZA TOKEN BACKEND RUNNING");
});

// ---------------- START ----------------
ensureSettings().then(() =>
  app.listen(PORT, () => console.log("SERVER RUNNING on PORT", PORT))
);
