// models/Claim.js
import mongoose from "mongoose";

const ClaimSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, index: true },
  referrer: { type: String, default: null },
  contact: { type: String, default: null },
  ip: { type: String },
  userAgent: { type: String },
  status: {
    type: String,
    enum: ["queued", "done", "rejected"],
    default: "queued",
  },
  referrals: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Claim = mongoose.models.Claim || mongoose.model("Claim", ClaimSchema);

export { Claim };
