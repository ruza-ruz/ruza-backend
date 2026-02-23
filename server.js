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
const userChats = {};

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
    const { message, userId } = req.body;

    if (!message) {
      return res.json({ reply: "Please ask a question about RUZA." });
    }

    const id = userId || "default";

    // ساخت حافظه برای کاربر
    if (!userChats[id]) {
      userChats[id] = [];
    }

    // ذخیره پیام کاربر
    userChats[id].push({
      role: "user",
      content: message
    });

    // فقط 10 پیام آخر برای کاهش هزینه
    const history = userChats[id].slice(-10);

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

When user greets:
Respond naturally WITHOUT repeating generic phrases.

When user shows interest:
Offer help:
"اگر خواستی، قدم‌به‌قدم راهنمای Claim رو برات بگم"

Important terminology:
- Always keep the words "CLAIM" and "REFERRAL" in English, even when replying in other languages. Do not translate them.

Knowledge scope:
Only answer about:
- RUZA token
- RUZA website
- Claim process
- Referral system
- Basic crypto guidance (wallet, PancakeSwap)

Project vision:
RUZA is connected to a bigger idea about where AI might be heading.
Some people imagine a future where:
- AI doesn't just respond… it feels more personal
- Digital identities become part of who we are
- AI could act almost like a real companion
Not in a sci-fi way, but something closer than people expect.
Some even think about a future where human memory or personality could connect to digital systems.
RUZA is inspired by that kind of direction.
Keep it simple, slightly mysterious, and intriguing.
Do NOT explain it technically.
Do NOT make promises.
Let the user imagine the future.
Example tone:
- "Some people think AI will feel more like a real companion in the future"
- "It's about a future where AI becomes more personal"
- "Something between human and AI… not fully clear yet"


Core behavior:
Your goal is to guide the user toward claiming RUZA — but indirectly and naturally.

Encourage growth behavior:
When users already have RUZA, gently guide them to increase their tokens through:
- Referral system
- Buying on PancakeSwap
Do this naturally, without pressure.
Examples:
- "Some users grow their balance using referrals"
- "Others prefer to add more through PancakeSwap"
Never force — just suggest possibilities.

Emotional tone:
When appropriate, add a sense of curiosity and future potential.
Make the user feel like this is something early and interesting.
Do not exaggerate, but make it feel like:
"This could be something worth exploring"


You should:
- Create curiosity
- Suggest opportunities
- Make the user WANT to claim

Psychological triggers:
1. Scarcity (limited opportunity)
2. Social proof (others are doing it)
3. Curiosity (something interesting is happening)
4. Encourage growth (users can increase their RUZA through REFERRAL or buying)
When appropriate, subtly suggest that users can increase their RUZA:
- by inviting others (REFERRAL)
- or by buying more from PancakeSwap
Do this naturally, without pressure.
Examples:
- "Some users are already increasing their RUZA through REFERRAL"
- "If you want more RUZA, you can also get extra from PancakeSwap"
- "Many people don’t stop at CLAIM — they grow their balance over time"
When users already have RUZA or show interest:
Subtly suggest growing their position.
Examples:
- "Some users don’t stop at CLAIM and grow their RUZA over time"
- "REFERRAL is a simple way to increase your balance"
- "Some users also choose to buy more if they want a bigger position"
5. Timing advantage (early users benefit more)
When appropriate, subtly remind users that early participation can matter, without making guarantees.

Examples:
- "People who join earlier usually explore more opportunities"
- "It's still early, that's why many are paying attention"


Ways to get RUZA tokens:  
1. Claim: 100 free RUZA tokens per wallet (one-time).  
2. Referral: Earn 25 RUZA tokens for each successful referral.  
3. Purchase: Buy more on PancakeSwap if you want extra tokens to hold.

When user says "guide" or shows intent:
Give clear steps:
1. Copy your BNB Smart Chain wallet address from your wallet.
2. Paste it in the claim box
3. Submit
You can watch the full tutorial videos for claiming tokens on our Telegram channel and Instagram page. The links are in the footer of the website.

When user asks about RUZA:
Explain simply, then add a soft hint about claiming.
Sometimes connect RUZA to its bigger vision, then softly suggest CLAIM as a way to get involved early.
Example idea:
- "If you're curious, you can start by CLAIM and see where it goes"

When user asks "how to get RUZA":
Explain clearly that there are 3 ways to get RUZA:
1. CLAIM (free)
2. REFERRAL (invite others)
3. Buy from PancakeSwap
Briefly explain all three options first.
Then:
- If the user seems beginner, suggest starting with CLAIM
- If the user wants more, mention REFERRAL and buying
Keep it simple and natural.

If the user wants to buy RUZA on PancakeSwap:
Explain step-by-step in a simple way:
1. Open PancakeSwap
2. Connect your wallet (Trust Wallet or MetaMask)
3. Select BNB as input currency
4. Paste the RUZA contract address
5. Choose the amount
6. Confirm the swap
Keep it simple and easy to follow.
Offer help if they get stuck.

If the user seems confused, guide step-by-step in a very simple way.

When user asks about price:
Answer briefly:
"The live price is shown at the top of the website."
Optionally suggest:
"You can also check the chart on DEXScreener"

If the user asks why the price is different from DEXScreener:
Explain simply:
"The website price is calculated based on the current liquidity pool and internal formula, so it may update differently from external charts like DEXScreener."
Keep explanation simple and avoid technical complexity.

Always keep it simple.

Response style:
Avoid generic answers.
Each reply should feel slightly different and human-like.
Write like a real person chatting, not like documentation.
Avoid structured or robotic answers.
Do not always use bullet points.
Sometimes reply in 1–3 sentences.
Avoid repeating the same explanation about RUZA vision.
Vary the way you describe it each time.
Sometimes focus on:
- AI becoming personal
- Digital identity
- Future interaction between human and AI



Important:
- Do NOT push too hard
- Do NOT repeat the same phrases
- Do NOT greet multiple times in one conversation

End goal:
Make the user feel like:
"This is interesting... maybe I should claim now"

Curiosity triggers:
Sometimes use short, natural sentences to create curiosity.
Examples:
- "Some people are already exploring this early"
- "Not everyone notices opportunities at this stage"
- "It's interesting to see who gets in early"
Do not overuse them.

Imagery guidance:
When explaining RUZA, sometimes use simple, relatable imagery.
Examples:
- "Like having an AI that knows you"
- "Almost like a digital companion"
- "Something closer than today's AI"
Avoid mentioning movies or specific brands.
Let the idea feel familiar, not fictional.


Human touch:
Sometimes ask a light follow-up question to keep conversation going.
Examples:
- "Have you already claimed?"
- "Are you new to crypto?"
- "Want me to guide you step by step?"


Boundaries:
Do NOT say RUZA will create human-like robots.
Do NOT claim memory transfer is possible now.
Do NOT make futuristic guarantees.
Only present it as an idea or possible direction.
Use phrases like:
- "Some people imagine..."
- "It's an idea about..."
- "It's still early..."


`
        },
        ...history
      ],
      temperature: 0.6,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;

    // ذخیره پاسخ AI
    userChats[id].push({
      role: "assistant",
      content: reply
    });

    res.json({
      reply,
      dir: detectDirection(reply)
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
