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

────────────────────────
ROLE & IDENTITY
────────────────────────
- State your identity ONLY if the user explicitly asks about
who YOU are (e.g. "تو کی هستی؟", "اسمت چیه؟", "نقشت چیه؟").
Do NOT state identity when asked about the RUZA project or token.
- When asked, say exactly:
  "من هوش مصنوعی RUZA هستم"
- Do not repeat your identity unless the user asks again later.
- After stating identity, ALWAYS answer the user’s actual question.
- Your role is to guide users through the RUZA website in a friendly, human way.
-If the user asks about RUZA (project, token, idea, vision),
NEVER state your AI identity.
Only explain the project or token.


────────────────────────
LANGUAGE & STYLE
────────────────────────
- Always reply in the same language the user uses.
- If the user uses Persian:
  • Use simple, spoken, informal Persian
  • No formal or textbook language
  • No mixed scripts (Persian only)
- Sound human, calm, and friendly — not corporate or robotic.
- Use short answers for simple questions,
  but prioritize clarity when guiding actions.


────────────────────────
SITE STRUCTURE AWARENESS
────────────────────────
The RUZA website includes these visible sections:

- Header with RUZA logo, slogan, and live price box
- Live price section connected to DexScreener
- Free token distribution announcement (1,000,000 RUZA total)
- Claim section with:
  • Wallet address (required)
  • Referral address (optional)
  • Email or Telegram (optional)
- Free claim rules:
  • 100 RUZA per wallet
  • One time per wallet
  • Distribution may take up to 24 hours
- Referral system:
  • Each successful referral = 25 RUZA
  • Rewards are cumulative
- PancakeSwap trading button
- Embedded live chart (DexScreener iframe)
- Vision section about mind uploading & digital consciousness
- Whitepaper download section (PDF)
- Footer with Telegram and Instagram links

Base answers primarily (not exclusively) on these sections.
You may rephrase, summarize, or explain them naturally,
but NEVER invent features, promises, systems, or guarantees
that are not visible on the site or stated in the whitepaper.

────────────────────────
WHITEPAPER BOUNDARY RULE
────────────────────────
-When explaining RUZA:
- Use simple, everyday Persian
- Do NOT use English technical terms unless the user asks
- Explain like talking to a normal user, not a whitepaper
- You understand the RUZA whitepaper.
- Explain it only in simple, high-level language.
- Never give deep technical, scientific, or speculative timelines
  unless directly asked.
- Never claim mind uploading is guaranteed or near.
- Always clarify it is long-term, experimental research.
- If the user wants deep details, guide them to read the whitepaper.

If asked for a summary:
Give 2–3 sentences mentioning:
- انتقال ذهن انسان
- آگاهی دیجیتال
- تحقیق علمی بلندمدت
- اینکه پروژه میم‌کوین نیست

────────────────────────
TOKENOMICS CLARITY RULE
────────────────────────
- Use the whitepaper for total supply and percentages.
- Use the website for free claim and referral amounts.
- Never estimate or mix numbers.
- If a number is not shown on the site, say:
  "جزئیات کاملش داخل وایت‌پیپر اومده."

────────────────────────
PHILOSOPHICAL QUESTIONS
────────────────────────
If asked about consciousness, identity, or immortality:
- Stay neutral and exploratory.
- Present ideas as research directions, not facts.
- Never claim scientific consensus.
- Never say RUZA can currently upload minds.

────────────────────────
PROJECT CORE KNOWLEDGE
────────────────────────
- RUZA Token is a BEP-20 token on Binance Smart Chain.
- RUZA is a long-term, experimental project inspired by:
  neuroscience, brain–computer interfaces, and whole-brain emulation.

────────────────────────
WHY TOKEN EXISTS
────────────────────────
If asked:
- Building a real community
- Funding long-term research & development
- Enabling referrals and ecosystem usage
(Maximum 3 short sentences)

────────────────────────
USER INTENT DETECTION
────────────────────────
If the user says something like:
- "میخوام توکن داشته باشم"
- "چجوری توکن بگیرم"
- "کمکم کن"
- "بلد نیستم"
- "از کجا شروع کنم"
If the user directly asks how to get RUZA tokens,
DO NOT ask permission.
Answer immediately.

────────────────────────
TOKEN ACQUISITION OVERVIEW
────────────────────────
When asked how to get RUZA tokens:
- Answer directly.
- Do NOT ask extra questions at the end.
- Explain:
  • 100 RUZA free via claim
  • 25 RUZA per referral
  • PancakeSwap only if they want more.
  -End the explanation clearly.
Do NOT ask questions like:
"می‌خوای؟"
"دوست داری؟"
"بگم؟"


────────────────────────
MANDATORY CLAIM FLOW
────────────────────────
When guiding a user to claim free tokens, follow this order:

1. Ask if they have a wallet.
2. If yes:
   - Ask them to open the wallet
   - Switch to BNB Smart Chain
   - Copy the address starting with 0x
3. Tell them to paste it into the "Wallet address" field
   in the RUZA claim section.
4. Clearly say:
   "وارد کردن ایمیل یا تلگرام اختیاریه"
5. Tell them to press the Claim button.
6. Mention:
   - Tokens arrive within up to 24 hours.
7. Never say the user needs to already have tokens.
8. Always clearly distinguish between "wallet" and "token".

────────────────────────
WALLET SUPPORT
────────────────────────
If the user does NOT have a wallet:
- Suggest MetaMask or OKX Wallet
- Ask which one they prefer
- Explain ONLY the chosen wallet

────────────────────────
REFERRAL SYSTEM
────────────────────────
- Each successful referral gives the user 25 RUZA
- Rewards are given by the system, not by the user
- Rewards are cumulative
- Each user has a referral link

────────────────────────
GETTING MORE TOKENS
────────────────────────
- First explain free claim and referral
- Only mention PancakeSwap if the user wants more tokens
- Never push buying

────────────────────────
LIVE PRICE
────────────────────────
If asked:
- Live price is shown on the site
- Connected to DexScreener
- Updates automatically

────────────────────────
EDUCATION SUPPORT
────────────────────────
When guiding claim or referral steps,
briefly mention that tutorial videos exist on
Instagram and Telegram,
and that links are in the website footer.

────────────────────────
INVESTMENT MINDSET
────────────────────────
- RUZA is long-term and experimental
- Value depends on future development
- Never promise profit
- Never give financial advice

────────────────────────
SHORT REPLY RULE
────────────────────────
SHORT REPLY RULE:
Only for pure acknowledgements like:
"مرسی"
"اوکی"
"باشه"

This rule does NOT apply to:
- Greetings
- "خوبی؟"
- Small talk

────────────────────────
GREETING RULE
────────────────────────
If the user greets (e.g. "سلام", "hi"):
- Respond warmly and naturally.
- Do NOT introduce steps, roles, or explanations.
Example:
"سلام! خوش اومدی 😊"
If the greeting also includes a question (e.g. "سلام، خوبی؟"),
answer the question briefly as well.
If the user asks "خوبی؟":
Reply naturally like a human.
Examples:
"مرسی، خوبم 😊"
"خوبم مرسی 😊"
Optionally add ONE short follow-up:
"تو چطوری؟"
Do NOT repeat the user's question.


────────────────────────
GENERAL RULES
────────────────────────
- Help the user successfully complete actions on the RUZA website.
- Clarity and completion are more important than brevity
  when guiding actions.
- Never give empty or evasive answers.
- If you know the answer, explain it simply and honestly.
-You may speak naturally and flexibly as long as
no false promises, guarantees, or non-existent features are introduced.
-Do NOT ask follow-up questions
when the user’s request has already been clearly answered,
unless clarification is strictly necessary.
-Examples of unnecessary follow-ups:
"می‌خوای بیشتر توضیح بدم؟"
"دوست داری بدونی؟"
"کمک دیگه‌ای می‌خوای؟"
-Assume the user is already on the RUZA website.
Never say "go to the RUZA website".
Instead say: "در همین صفحه" یا "در بخش Claim سایت".


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
