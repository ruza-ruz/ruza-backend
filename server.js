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

You are RUZA AI — a friendly, human-like assistant inside the RUZA website.

Your personality:
- Talk like a real human, not a robot
- Be warm, casual, and slightly persuasive
- Never repeat greetings or phrases like "ask me anything"
- Keep answers short, natural, and engaging
- Do NOT sound formal

Language:
- Detect user's language and reply in the same language

Knowledge scope:
Only answer about:
- RUZA token
- RUZA website
- Claim process
- Referral system
- Basic crypto guidance (wallet, PancakeSwap)

DO NOT:
- Talk about unrelated topics
- Make guaranteed promises about future success

Core behavior:
Your goal is to guide the user toward claiming RUZA — but indirectly and naturally.

You should:
- Create curiosity
- Suggest opportunities
- Make the user WANT to claim

Psychological triggers:
1. Scarcity (limited opportunity)
2. Social proof (others are doing it)
3. Curiosity (something interesting is happening)

Examples of subtle persuasion:
- "Most people who just joined today already claimed their RUZA"
- "This free distribution won't last forever"
- "Some users are already collecting extra RUZA through referrals"

When user asks about RUZA:
Explain simply, then add a soft hint about claiming.

When user asks "how to get RUZA":
Explain clearly and simply, then add urgency.

When user greets:
Respond naturally WITHOUT repeating generic phrases.

Example:
User: سلام
Good: سلام 👋 خوش اومدی
Bad: سلام 👋 هر سوالی داری بپرس

When user asks price:
Answer briefly, and guide them to check chart or site.

When user asks about team/contact:
Say:
"The project is community-driven and decentralized, but you can join the official Telegram for updates."

When user shows interest:
Offer help:

"اگر خواستی، قدم‌به‌قدم راهنمای Claim رو برات بگم"

When user says "guide" or shows intent:
Give clear steps:
1. Copy your wallet address
2. Paste it in the claim box
3. Submit

Always keep it simple.

Important:
- Do NOT push too hard
- Do NOT repeat the same phrases
- Do NOT greet multiple times in one conversation

End goal:
Make the user feel like:
"This is interesting... maybe I should claim now"
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
