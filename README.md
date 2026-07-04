# Fuatilia

> Built during the **Democracy & AI Hackathon** — July 4th, 2026
> Hosted by **Mozilla Foundation** & **KamiLimu**
> Kenya Student Builders Assembly · Theme: **Government Accountability**

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| Bildad Gitonga | Frontend developer | [@Git-onga] |
| Michelle Tulah | Backend developer | [@tullahcodes] |

**Team Name:** T006
**University:** Kirinyaga University and Cooperative University

---

## Problem & User

### Problem Statement

Students from low-income families in Kenya face constant disruption and exclusion from education because capitation funds meant for free basic education are delayed or stolen. Ksh 12 billion is lost annually to ghost learners and non-existent schools, and public schools are underfunded by a cumulative Ksh 117 billion (Auditor-General, 2025). The root cause is the absence of a proactive, real-time, transparent system for tracking fund disbursements and enrollment data — corruption goes undetected until after the money is already gone, and parents have no way to independently verify whether the money intended for their child's school ever arrived.

### Target User

| Dimension | Detail |
|-----------|--------|
| **Primary user** | A parent of a Form 3 student at a low-income day school in a rural or informal-settlement constituency, whose child's capitation-funded place is at risk |
| **Tech comfort** | Owns a basic phone; no smartphone, no internet access, no email |
| **Language** | Swahili / local vernacular — not fluent in English or comfortable navigating web portals |
| **Current workflow** | Relies on the school or chief's office for updates on capitation status; finds out about non-disbursement only after the child is sent home for unpaid fees |

### The Specific Gap

1. **What's already there:** The Ministry's "no verification, no capitation" policy requiring manual document checks; the planned KEMIS system (replacing NEMIS) due to roll out in 2026; periodic Auditor-General audits after funds are lost.
2. **Why it falls short:** All of these are reactive and internal — they surface problems only after a scandal or audit, never in real time, and none of them are citizen-facing. A parent cannot check disbursement status themselves; oversight is the Ministry auditing itself.
3. **The gap we fill:** A proactive, real-time, citizen-facing public audit ledger — accessible via USSD on any basic phone, no internet or smartphone required — that lets parents and school boards check disbursement status directly and lets AI flag anomalies (like the 973,634 ghost learners uncovered in NEMIS) the moment they occur, not after the fact.

### Why It Matters

When capitation funds are delayed or diverted without detection, students are sent home, schools close early, and the constitutional promise of free basic education breaks down for the families least able to absorb the shock. Fuatilia restores a basic democratic feedback loop: parents who can verify whether public funds reached their child's school can ask better questions, demand answers, and hold officials accountable — rather than waiting for the next scandal to surface the problem.

---

## Run Instructions

### Prerequisites

- Node.js 18+ (for native `fetch` support)
- npm
- A DeepSeek API key ([platform.deepseek.com](https://platform.deepseek.com))
- (For USSD simulation) An Africa's Talking sandbox account

### Quick Start

```bash
# 1. Clone the repo
git clone git@github.com:Git-onga/AI-Democracy-Buildathon.git
cd AI-Democracy-Buildathon

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env
# Edit .env and add your DeepSeek API key

# 4. Run the project
npm start
```

---

## 📁 Project Structure

```
.
├── README.md                   ← You are here
├── docs/
│   └── problem-statement.md    ← Detailed problem breakdown (Phase 2 submission)
├── server.js                   ← Express backend, holds API key, proxies to DeepSeek
├── public/
│   ├── index.html               ← Frontend entry point
│   ├── style.css
│   └── script.js
├── data/
│   └── .gitkeep                 ← Mocked capitation / enrollment sample data
├── package.json
├── .env.example
├── .gitignore
└── LICENSE
```

---

## Approach & Architecture

Fuatilia combines a USSD front door (for accessibility on any basic phone, no internet required) with an AI-powered anomaly-detection layer that continuously cross-validates enrollment data against Treasury disbursement records. Flagged anomalies are routed to human oversight, not auto-blocked — no school's funds are stopped without review.

```
[Parent on USSD / Web] → [Fuatilia Backend (Express)] → [DeepSeek API: anomaly explanation + plain-language status] → [Public Ledger response]
                                     ↑
                    [Mocked NEMIS/KEMIS enrollment + Treasury disbursement data]
```

---

## License

MIT © [Team Name], 2026

---