# Running the MOOD MIX AI Agents — Cost & Break-Even Analysis

> A financial view of running the full paid AI-agent stack (Reddit, X/Twitter, Google
> Reviews/Trends, Amazon, Claude). **This lives outside the app**, for the owner's
> internal decision-making. All figures are realistic estimates (₹ at ~₹83/USD) —
> swap in real invoices once subscriptions are live.

## 1. Monthly cost of the agent stack

| Agent / API | Plan | $/mo | ₹/mo | Cost type |
|---|---|---:|---:|---|
| **SerpAPI** (Google Reviews + Trends + Amazon search) | Production (15k searches) | $150 | ₹12,450 | Fixed |
| **X / Twitter API** | Basic | $100 | ₹8,300 | Fixed |
| **Amazon reviews scraper** (Outscraper / Apify) | Starter | $50 | ₹4,150 | Fixed |
| **Reddit API** (commercial use) | Low-volume | $50 | ₹4,150 | Fixed |
| **Claude (Anthropic)** — synthesis & classification | Pay-as-you-go | ~$40 | ₹3,320 | **Variable** |
| YouTube Data API / Discord / GitHub Actions cron | Free tier | $0 | ₹0 | — |
| **Fixed subtotal** | | **$350** | **₹29,050** | |
| **Variable subtotal** | | **~$40** | **~₹3,320** | |
| **Total** | | **~$390** | **≈ ₹32,400 / mo** | |

**Annual total ≈ ₹3.9 lakh.**

### Impact on the business cost structure
- **~90% of the agent cost is FIXED** (subscriptions that don't move with sales). This *raises operating leverage* — it adds to monthly fixed overhead whether you sell ₹1 or ₹10 lakh.
- **Variable portion is small** (Claude tokens, ~₹3.3k/mo) and scales gently with how often the agents run.
- Added to MadMix's existing fixed costs, the agent stack is a **fixed-cost bet that must be earned back through better decisions**, not a per-unit cost.

## 2. What the agents must "earn back" (break-even)

The agents pay for themselves by improving decisions — chiefly:
- **Ad efficiency:** shifting spend toward the lower-A2S platform (e.g. Instamart A2S 0.49 → Big Basket 0.31).
- **Fewer stock-outs:** the replenishment AI keeps hero SKUs in stock in high-demand cities.
- **Higher-ROI collabs:** acting on festival/event opportunities before competitors.

**Break-even model (assumptions stated):**
- Monthly agent cost to cover: **₹32,400**.
- MadMix contribution margin on incremental revenue: **~30%** (after COGS ~35% + quick-commerce take ~30% + ads; see the Unit Economics tab).
- **Break-even incremental revenue** = ₹32,400 ÷ 0.30 = **≈ ₹1.08 lakh / month** of *additional* revenue (or equivalent waste avoided) the insights must drive.

| Incremental revenue driven/saved by agents (₹/mo) | Contribution @30% | Agent cost | Net |
|---:|---:|---:|---:|
| 0 | ₹0 | ₹32,400 | −₹32,400 |
| 54,000 | ₹16,200 | ₹32,400 | −₹16,200 |
| **1,08,000 (break-even)** | **₹32,400** | **₹32,400** | **₹0** |
| 2,00,000 | ₹60,000 | ₹32,400 | +₹27,600 |
| 3,00,000 | ₹90,000 | ₹32,400 | +₹57,600 |

> Reality check: on ~₹3.7 lakh/month of revenue, the stack needs the insights to move
> roughly **+₹1.1 lakh/month** (revenue gained or waste avoided) to break even. A single
> ad-budget reallocation at the current A2S gap can already recover a large part of that —
> so the bet is reasonable, but **start lean** (free tiers + SerpAPI only) and add the
> paid agents once each proves its keep.

## 3. Recommendation
- **Phase 1 (₹0–4k/mo):** SerpAPI free tier + YouTube/Discord free + Claude pay-go. Prove value.
- **Phase 2 (~₹17k/mo):** add SerpAPI Production + Amazon scraper once reviews/competitor data drives decisions.
- **Phase 3 (~₹32k/mo):** add X + Reddit commercial only if social signal materially changes calls.

See the break-even chart shared alongside this document.
