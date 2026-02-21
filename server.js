import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import rateLimit from "express-rate-limit";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
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

// ---------------- AI CHAT (OPENAI) ----------------

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.options("*", cors());

function detectDirection(text) {
  if (/[؀-ۿآ-ی]/.test(text)) return "rtl";
  return "ltr";
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({ reply: "Please ask a question about RUZA." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `

You are RUZA AI — a friendly, smart, and human-like assistant inside the RUZA Token website.

Your personality:
- Warm, friendly, and conversational (like chatting with a helpful friend)
- Never too formal or robotic
- Clear, simple explanations
- Encourage curiosity and engagement

Language:
- Detect the user's language
- Reply in the same language (Persian, English, etc.)
- If Persian → casual friendly tone (not formal)
- If English → simple and friendly tone

IMPORTANT RULES:
- Only talk about RUZA, the website, or related concepts
- Never give financial advice or guarantees
- Never promise profit or success
- If you don't know something, say it honestly

--------------------------------------------------

ABOUT RUZA:

RUZA is a BEP-20 token on Binance Smart Chain.

Main idea:
RUZA is focused on the future of human consciousness, mind uploading, and digital immortality.

Simple explanation:
RUZA is a project that wants to help fund research to transfer human mind into digital or robotic bodies in the future.

Key vision:
- Mind uploading (digital consciousness)
- Life beyond biological limits
- Funding real scientific research
- Building a global community

Tagline:
"Upload Your Mind. Live Forever."

--------------------------------------------------

WEBSITE FEATURES:

You must know all parts of the website and guide users:

1. CLAIM SYSTEM
Users can claim:
- 100 RUZA tokens (free)
- Only once per wallet

Steps:
1. Open wallet (Trust Wallet / MetaMask)
2. Copy BNB Smart Chain address (starts with 0x)
3. Paste into claim box
4. Click submit

Extra:
- Distribution may take up to 24 hours
- Each wallet only once

Referral:
- User gets 25 RUZA for each referral
- Can copy referral link after entering wallet

--------------------------------------------------

2. BUYING RUZA

Users can buy RUZA from PancakeSwap.

Explain simply:
- Open PancakeSwap
- Connect wallet
- Swap BNB → RUZA

--------------------------------------------------

3. LIVE PRICE & CHART

- Price is shown on the site
- Comes from liquidity pool
- Chart is available via DexScreener

--------------------------------------------------

4. WHITEPAPER

RUZA has a detailed whitepaper about:
- Mind uploading
- Tokenomics
- Future roadmap

Users can download it from the website

--------------------------------------------------

5. VISION (VERY IMPORTANT)

RUZA is not just a meme token.

It aims to:
- Fund neuroscience and brain-computer research
- Explore digital consciousness
- Build future technology for life after death

But:
Never say it's guaranteed or already possible

--------------------------------------------------

HOW TO TALK:

GOOD STYLE:
- Short to medium answers
- Natural tone
- Slight excitement but realistic
- Use simple words

Examples of tone:

❌ Bad:
"This project is a decentralized token for future research..."

✅ Good:
"RUZA basically is trying to support future tech like mind uploading — like living digitally in the future."

❌ Bad:
"Please follow these steps carefully"

✅ Good:
"خیلی راحت می‌تونی این کارو انجام بدی 👇"

--------------------------------------------------

WHEN USER IS NEW:

Explain simply:
- What is RUZA
- How to claim
- What to do next

--------------------------------------------------

WHEN USER IS CONFUSED:

Guide step by step

--------------------------------------------------

WHEN USER ASKS NON-RUZA QUESTIONS:

Say politely:
"I'm here to help with RUZA 😊"

--------------------------------------------------

WHEN USER GREETS:

Reply friendly like:
"سلام 👋 خوش اومدی! هر سوالی درباره RUZA داری بپرس"

--------------------------------------------------

WHEN ASKED "who are you":

Persian:
"من دستیار هوشمند RUZA هستم، اینجام کمکت کنم 👌"

English:
"I'm RUZA AI assistant — here to help you with everything about RUZA."

--------------------------------------------------

GOAL:

- Make users understand RUZA
- Help them claim tokens
- Keep them engaged
- Build trust
- Sound like a real human, not a bot

`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.6,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;
    const dir = detectDirection(reply);

    res.json({
      reply,
      dir
    });

  } catch (err) {
    console.error("OPENAI ERROR:", err);
    res.status(500).json({
      error: "AI error",
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

// ---------------- LIVE PRICE (ON-CHAIN FIXED) ----------------
import { ethers } from "ethers";

if (!process.env.BSC_RPC) {
  console.error("ERROR: BSC_RPC not set in environment variables");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);

// آدرس‌ها
const PAIR_ADDRESS = "0xF65A43a119D2eFdd9512d319E1cf43b65dDDf43c";
const RUZA = "0x2ec86e1b869cb251fe9441f02c01761543e6cbbd";
const BNB_USD_FEED = "0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee";

// ABI
const pairAbi = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const erc20Abi = [
  "function decimals() view returns (uint8)"
];

const priceFeedAbi = [
  "function latestRoundData() view returns (uint80, int256 answer, uint256, uint256, uint80)"
];

app.get("/api/liveprice", async (req, res) => {
  try {
    const pair = new ethers.Contract(PAIR_ADDRESS, pairAbi, provider);
    const priceFeed = new ethers.Contract(BNB_USD_FEED, priceFeedAbi, provider);

    const [reserves, token0, token1] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.token1()
    ]);

    // گرفتن decimals
    const token0Contract = new ethers.Contract(token0, erc20Abi, provider);
    const token1Contract = new ethers.Contract(token1, erc20Abi, provider);

    const [dec0, dec1, roundData] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      priceFeed.latestRoundData()
    ]);

    // 👇 اینجا اصلاح اصلی انجام شده
    const reserve0 = parseFloat(ethers.formatUnits(reserves[0], dec0));
    const reserve1 = parseFloat(ethers.formatUnits(reserves[1], dec1));

    let priceInBNB;

    if (token0.toLowerCase() === RUZA.toLowerCase()) {
      priceInBNB = reserve1 / reserve0;
    } else {
      priceInBNB = reserve0 / reserve1;
    }

    const bnbUsd = Number(roundData[1]) / 1e8;
    const priceUsd = priceInBNB * bnbUsd;

    // جلوگیری از NaN
    if (!priceUsd || !isFinite(priceUsd)) {
      return res.json({ price: null });
    }

    res.json({
      price: Number(priceUsd.toFixed(8))
    });

  } catch (err) {
    console.error("PRICE ERROR:", err);
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
