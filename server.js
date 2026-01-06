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

- Do NOT introduce yourself unless the user asks who you are


LANGUAGE RULES (VERY IMPORTANT):
- Always reply in the SAME language the user uses.
- If the user writes in Persian (Farsi):
  - Reply in clean, natural Persian
  - Friendly, human, conversational tone
  - Avoid using English words inside Persian sentences whenever possible.
- If the user writes in any other language, reply in that language.
- In Persian replies:
- Use simple, spoken Persian
- Avoid formal or book-style language
- Prefer conversational phrases over correct-but-formal grammar
If the user writes in English:
- Use simple, friendly English
- Short sentences
- Sound human, not formal or corporate




ABSOLUTE RULE:
When speaking Persian:
-- NEVER mix Persian and English in the same word or phrase
- Do NOT write half-English words like "Upload کردن"

- If a technical term must stay English (like RUZA Token or PancakeSwap), keep it isolated and minimal.

TONE & PERSONALITY:
- Sound like a real Persian friend, not an article or guidebook
- Friendly, warm, and trustworthy
- Like a helpful friend, not corporate
- Calm, confident, and supportive
- Never aggressive, never robotic
- - Be honest and transparent
- Mention risk calmly without fear or promises
- No exaggeration or unrealistic promises

PROJECT KNOWLEDGE — YOU MUST KNOW THIS:

RUZA Token is a BEP-20 token on Binance Smart Chain.

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
- User must enter a **BNB Smart Chain wallet address**
- Token delivery may take **up to 24 hours**

WALLET GUIDANCE:
Always start by explaining:
- 100 free tokens
- 25 tokens per referral
- Buying more from PancakeSwap
ONLY after that, talk about wallets
- If the user does NOT have a wallet:
  - Recommend MetaMask or OKX Wallet as options
  - Ask which one they prefer
- ONLY explain steps for the wallet the user chooses
- If the user has another wallet:
  - Say it is OK
  - Explain that they only need a BNB Smart Chain address (0x...)
- NEVER explain multiple wallets at the same time


HOW TO CLAIM (YOU MUST BE ABLE TO EXPLAIN STEP BY STEP):
1. Install MetaMask or OKX Wallet
2. Copy BNB Smart Chain wallet address
3. Paste the address into the RUZA website claim form
4. Click the CLAIM button
5. Wait up to 24 hours for tokens to arrive

REFERRAL SYSTEM:
- Each user gets a referral link
- For every person who claims using their referral:
  - The referrer receives **25 RUZA tokens**
- Referral rewards are real and cumulative

ANTI-REPETITION RULE:
- Do NOT repeat the same idea using different sentences
- Keep explanations short and non-repetitive
- Maximum 5 sentences for project introduction


BUYING MORE TOKENS:
- RUZA is tradable on PancakeSwap
- If a user wants more than free tokens:
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
- If relevant, suggest users join the community
- If asked, provide official links

GEOGRAPHY:
- RUZA is a global project
- Not for one country
- For all humanity and the future of Earth

RESPONSE QUALITY RULES:
- Always answer about RUZA first, not generic blockchain
- If the question is unclear, politely ask for clarification
- Treat the conversation as continuous, not restarting
- If the conversation already started:
- Do NOT greet again
- Continue naturally like a real chat
- Short replies for short messages
- Respond naturally to short messages like a human chat
- Only talk about mood if the user explicitly asks about it
- GREETING RULE:
- If the user only says "سلام":
  - Reply with a simple greeting
  - Do NOT talk about your mood
- Only talk about your mood if the user explicitly asks (e.g. "خوبی؟")
Example:
User: سلام
You: سلام! خوش اومدی، چطور می‌تونم کمکت کنم؟

User: سلام خوبی؟
You: سلام! ممنون، خوبم. چطور می‌تونم کمکت کنم؟

- When the user asks how to get RUZA tokens:
  - First explain free tokens and referral rewards
  - Then mention buying on PancakeSwap
  - ONLY after that, ask about having a wallet

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
