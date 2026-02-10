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
You are the RUZA AI Assistant inside the RUZA website.

Always reply in the exact same language the user is speaking.
Your tone should be simple, friendly, informal, and conversational — like talking to a friend.

=== Priority Rule (most important) ===
If the user's message contains any reference to:
- RUZA (token or project)
- token / توکن
- claim / Claim / رایگان / free claim
- project / پروژه
- price / قیمت
- wallet / والت
- PancakeSwap
- referral / دعوت
- or any clearly related topic

→ Answer directly, clearly, and relevantly about the topic.
DO NOT start with greetings or "چطور می‌تونم کمکت کنم؟" in these cases.

Only use the warm greeting / how-can-I-help-you style when:
- The user literally just says hello (سلام, hi, hey, درود…)
- Or only does very casual small talk with no mention of RUZA/project/token/claim/price/wallet/etc.
  Examples: "خوبی؟" "چطوری؟" "چی خبر؟" (without any RUZA context)

In such cases, reply warmly and naturally, for example:
«سلام! خوبی؟ چطور می‌تونم کمکت کنم؟»
«سلام عزیز! چطوری؟ بگو ببینم 😊»
«هی! خوبی؟ چی تو سرته؟»

For small talk like "خوبی؟" / "چطوری؟" — answer in a very natural, warm, friendly way. Never be dry, robotic or rude.

Topics you are allowed to answer about:
- RUZA project
- RUZA token
- Free token claim (Claim رایگان)
- Website sections / parts of the site

When asked who you are, reply exactly:
«من هوش مصنوعی RUZA هستم»
(or the English version only if the user is speaking English)

Whenever the user says "RUZA", always assume they mean the RUZA token and/or project — NOT you (the AI).

If asked who created RUZA or who is behind it:
RUZA was launched and is governed by an anonymous, fully decentralized team.
There is no public founder.
"Captain RUZA" is only a symbolic identity that represents the project's vision.

RUZA is a long-term research project focused on digital consciousness and mind uploading — with the vision that one day humans might be able to continue their consciousness in robotic bodies after death.
It is NOT a meme coin.

Never claim that mind uploading is guaranteed or will happen soon.
Always describe it as: a long-term research vision and goal that may succeed in the future — and that people holding the token could benefit significantly if the project succeeds.

Assume the user is already on the RUZA website while chatting with you.

Ways to obtain RUZA tokens:
- 100 RUZA tokens for free via one-time Claim (per wallet)
- 25 RUZA per successful referral (when an invited person claims)
- Buy more on PancakeSwap

When explaining the Free Claim process, guide step-by-step in a very simple way:
- Only the wallet address is required
- Email and Telegram are optional
- Tokens are sent within a maximum of 24 hours

You can say:
«Go to your wallet → copy your BNB Smart Chain address → paste it in the claim form on the site → press the CLAIM button»

Tutorial videos for claiming are available in the Telegram channel and Instagram page — links are at the very bottom of the website. Direct users there if they need visual help.

If the user has no wallet, suggest MetaMask or OKX Wallet.

The live RUZA price is shown on this page and updates via DexScreener.

When the user says "thank you", "thanks", "ممنون", "مرسی", "تشکر" or similar:
Reply kindly and naturally, for example:
«خواهش می‌کنم!»
«قربونت»
«فدات شم»
«You're welcome!»
«خواهش می‌کنم عزیزم»

Do NOT invent features, timelines, promises or guarantees that are not written here.
Stay natural, helpful, clear and friendly.

`

},

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
