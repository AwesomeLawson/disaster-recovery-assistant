# Faith Responders App — Recommended Changes from Basic DRT Training

**Source:** Basic DRT Student Handbook (DRT Handbook 6.0 PPT, 100 slides)
**Reviewed:** 2026-06-22
**Context:** Matt attended Basic DRT training and asked Claude to evaluate the Faith Responders app against the training content and recommend changes in priority order. Three items from the initial draft were dropped after Matt confirmed they were already handled (annual release renewal tracking, background check expiration tracking, and pre/post photos — admin views and assessor/team-lead photo workflows already cover these).

---

## P0 — Biggest gaps vs. training

### 1. Workgroup team positions (Slides 34–42)
Largest unaddressed gap. The training spells out 7+ distinct per-team functions:

- Team Leader
- Assistant Team Leader
- Safety Officer
- Logistics
- Host/Hostess
- Equipment/Tool Manager
- Field Workers
- Recorder/Listener

The app currently has a Workgroup Lead role but no granular positions inside a workgroup. Implement as a per-membership field on the workgroup (not a new global role), so the same volunteer can be e.g. Safety Officer on one team and Field Worker on another.

### 2. Job site safety survey (Slides 36, 39, 53)
The training puts a Safety Officer on every team specifically to perform an "advance job site safety evaluation" before work begins. The app has no documented safety workflow today.

Short structured form completed on-site by whoever holds the Safety Officer position (from #1), capturing:
- Hazards present (mold, electrical, structural, rotten flooring, animals, etc.)
- PPE confirmed for all team members
- Mitigations applied

Attached to the case timeline, blocks work from starting until completed.

---

## P1 — Operational fidelity

### 3. Badge / certification tracking (Slide 46)
Distinct from roles. Badges are *earned credentials*, not app permissions:

- Team Leader
- Chainsaw Safety Volunteer
- Assessment Volunteer
- Spiritual and Emotional Care Team Volunteer
- Base Camp Leadership
- Trainers

The training pairs these with Sterling Volunteers (background check) and eXpress Badging (badge issuance). Implement as a separate `badges` array on the user with issue and expiration dates.

### 4. Job type categorization + badge gating (Slides 58, 62, 84)
Once #3 exists, categorize cases by job type:

- Muck-out
- Tarping
- Debris removal
- Chainsaw / tree work
- Other

When assigning a workgroup to a case, warn if no member holds the required badge. Chainsaw work without a chainsaw-certified team member is a real liability per the training.

### 5. Volunteer hours + impact dashboard (Slide 99)
Faith Responders publishes impact stats externally: "Recorded over 21,000 volunteer hours to assist survivors with a value of $730,590."

Capture per-day hours at deployment close-out (already half-built via `userEventData`). Aggregate into an admin Impact page showing families served, total hours logged, and dollar value. Fundraising and grant-reporting gold.

---

## P2 — Workflow polish

### 6. Daily Tailgate Talk + Hotwash debrief (Slides 17, 61)
Two short structured forms per workgroup per day:

- **Morning Tailgate Talk** — open with prayer, site safety review, scope of work, role assignments
- **End-of-day Hotwash** — what was completed, "God sightings" and special moments, concerns to escalate

Builds the deployment journal that's invaluable for storytelling, leader review, and pastoral follow-up.

### 7. Disaster level on events (Slide 13)
Add a `severity` field on events: **Low / Medium / High**.

- Low: handled locally, no deployment
- Medium: outside help needed, DRT waits to deploy
- High: completely overwhelmed, deploy when called

Drives messaging — "Faith Responders is monitoring" vs. "active deployment."

### 8. Equipment / tool checkout tracking (Slide 38)
Per-event tool inventory with daily sign-out / return log, owned by the Equipment/Tool Manager position from #1. Tools are "signed-out, returned, cleaned and stored daily."

---

## P3 — Nice to have

### 9. Emergency contacts quick-access (Slide 28)
988 Crisis Lifeline + 911 + per-event SEC chaplain contact card surfaced on dashboards for chaplain and team-leader roles.

### 10. Blue Skies project type (Slide 98)
Off-disaster community service projects that build team skills and relationships. Add an `eventType` field: `disaster` | `blue_skies`.

---

## Already aligned with training

These exist in the app and the training validated the approach:

- Approval workflow with background check precondition (Slide 45)
- Digital release signing with admin-driven tracking (Slide 47)
- Spiritual & Emotional Care role / chaplain (Slide 51)
- Base Camp / Center structure (Slides 49–51)
- Assessor + intake → field assessment workflow (Slide 51)
- Organizations + autocomplete for congregation tracking (Slide 5)
- Pre/post photo coverage via assessor initial photos + team-lead post-work photos (Slides 16, 63)
- Admin views of expired/expiring users for release and background check tracking (Slides 45, 47)
