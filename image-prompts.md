# Flypass Holidays — Image Prompts

Every prompt below is written for a text-to-image generator (Midjourney, DALL·E, Stable Diffusion, etc.). Swap in your own tool's syntax/parameters as needed. A shared style suffix keeps every image feeling like one consistent shoot — copy it onto the end of each prompt.

**Style suffix (append to every prompt):**
> Editorial documentary photography, natural light, warm and honest tone, shallow depth of field, realistic skin tones and diverse cast, no text or logos in the image, no cheesy stock-photo poses, 4:5 vertical crop unless noted otherwise.

Replace the file at the same path/filename to drop a new image straight in — no HTML changes needed unless the aspect ratio changes significantly.

---

## 1. Homepage hero background video (`assets/hero-consult.mp4`, `hero-paris.mp4`, `hero-amalfi.mp4`, `hero-venice.mp4`)

These four clips crossfade behind the homepage hero text. Not covered below since you asked for images — flag if you'd like video-generation prompts for these too (Seedance/Runway/etc. style).

## 2. Homepage hero fallback image — `assets/hero-plate.webp`
**Used on:** Homepage hero (behind "Schengen Visa Agents for Non-UK Nationals..."), shown before the video loads / as the LCP image.
**Prompt:** A close-up of a UK passport-holder's hand placing a Schengen visa application folder on a wooden desk, a boarding pass and passport visible beside it, warm early-evening window light from the side, Ipswich/UK office setting implied but not overly branded, 16:9 crop.

## 3. Homepage services section (`assets/dest-greece.webp`, `svc-business.webp`, `svc-conference.webp`, `svc-medical.webp`, `svc-family.webp`, `svc-eu.webp`)
Six cards, "01" through "06", each needs a portrait (4:5) image.

- **01 · Tourist Visa** — reuses `dest-greece.webp` (see Destination Images below).
- **02 · Business Visa** (`svc-business.webp`) — Two colleagues in business attire shaking hands across a glass conference table, floor-to-ceiling windows behind them showing a European city skyline, daylight, professional but not corporate-stock stiff.
- **03 · Business Conference Visa** (`svc-conference.webp`) — Wide shot of a seated conference audience from behind, facing a lit stage with a speaker mid-presentation, warm stage lighting against a darker room, large industry-event scale.
- **04 · Medical Treatment Visa** (`svc-medical.webp`) — A patient and a clinician walking together down a bright, modern private clinic corridor, calm and reassuring mood, soft daylight from windows along the corridor, discretion implied (no visible medical details/charts).
- **05 · Family / Friend Visit Visa** (`svc-family.webp`) — Three generations of a family (grandparent, parent, child) sharing a long outdoor table at golden hour, food and laughter, European garden or terrace setting, warm summer evening light.
- **06 · EU Family Member Visit Visa** (`svc-eu.webp`) — A couple walking hand in hand across a floodlit old European town square at dusk, cobblestones, string lights or warm architectural lighting, romantic but understated.

## 4. Destination images — `assets/dest-belgium.webp`, `dest-france.webp`, `dest-greece.webp`, `dest-netherlands.webp`, `dest-spain.webp`
Used in the homepage services grid and on each country's own hero/destinations content. Portrait 4:5.

- **Belgium** (`dest-belgium.webp`) — The Grand Place in Brussels at dusk, guild hall facades lit from below, a few pedestrians for scale, warm gold-and-blue twilight sky.
- **France** (`dest-france.webp`) — Pont Alexandre III in Paris at dusk, the Eiffel Tower visible in the background, warm streetlights reflecting on the Seine.
- **Greece** (`dest-greece.webp`) — Sunset over the white houses and blue-domed churches of Oia, Santorini, deep orange-to-purple sky, caldera view.
- **Netherlands** (`dest-netherlands.webp`) — A classic Amsterdam canal at golden hour, narrow gabled townhouses reflected in the water, a bicycle leaning against a railing in the foreground.
- **Spain** (`dest-spain.webp`) — A sunlit plaza in Madrid or Barcelona, warm terracotta buildings, a small outdoor café scene, midday Mediterranean light.

## 5. Trust / people images — `assets/who-team.webp`, `trust-accountability.webp`, `why-file.webp`
Used across homepage, about-us, advisory, contact and country pages — these carry the "real people, real accountability" feeling, so keep faces warm and approachable, not corporate-stiff.

- **`who-team.webp`** — A small Schengen-visa consultancy team (2–3 people) reviewing a client's application together around a desk, one person pointing at a document, genuine collaborative expression, bright office with plants, portrait crop (used at 1000×1506).
- **`trust-accountability.webp`** — A single adviser sitting across a desk from a client, going through a folder of documents together, adviser gesturing to explain something on the page, client listening attentively, natural office light, mid-shot.
- **`why-file.webp`** — Close-up of hands checking a Schengen visa application file: bank statements, a passport photo page, and a printed itinerary fanned out on a desk, a pen resting on top, top-down or 45° angle, crisp documentary detail shot.

## 6. Process / application-file images — `assets/france-file-prep.webp`
**Used on:** Homepage (definition section), journal (BRP/eVisa article), privacy policy, terms, process page.
**Prompt:** Over-the-shoulder shot of someone checking a Schengen visa application line by line — a highlighter and printed checklist in hand, passport and supporting documents spread on the desk, focused and methodical mood, soft daylight, landscape 4:3 crop (used at 1600×1195).

## 7. Section background images — `assets/process-bg.webp`, `final-bg.webp`
Full-bleed section backgrounds with a dark overlay applied in CSS, so keep these images slightly darker/moodier than the rest — text sits on top of them.

- **`process-bg.webp`** (used on homepage "how we work" section, about-us, country, journal index) — A wide, moody shot of a visa application centre waiting area or a UK office corridor, shallow depth of field, desaturated warm tones, lots of negative space in the upper third for heading text to sit over.
- **`final-bg.webp`** (used as the closing CTA background on 8 pages) — A wide shot of an airport departure board or gate area at dusk, travellers walking with luggage in soft-focus, warm terminal lighting, cinematic and slightly dark for white text overlay.

## 8. France-specific images
- **`france-route.webp`** — Used on the country/destinations hub. Prompt: An overhead-style flat-lay of a paper map of Western Europe with a highlighted travel route pinned across France, Belgium and Germany, a passport and boarding pass resting on the map, soft desk lighting, top-down shot.
- **`france-visa-appointment-uk-hero.webp`** — Hero image for the France Schengen visa page. Prompt: A TLScontact-style visa application centre reception desk in the UK, a person checking in at the counter with a folder of documents, clean modern interior, daylight through large windows, landscape crop.
- **`france-slots.webp`** — Used on the France journal article and processing-time page (appointment scarcity theme). Prompt: Close-up of a hand tapping a smartphone screen showing a booking calendar with most days greyed out/unavailable and one date highlighted, soft indoor lighting, shallow depth of field on the phone screen.
- **`france-final-cta.webp`** — Closing CTA background on the France page. Prompt: A wide shot of the Eiffel Tower framed between Parisian rooftops at blue hour, lights just turning on across the city, cinematic and slightly dark for white text overlay, landscape crop.

## 9. Social-share preview images (Open Graph, 1200×630 landscape)
These appear as the link-preview thumbnail when a page URL is shared on WhatsApp/Facebook/LinkedIn/X. Keep them simple: one strong photo plus room for the Flypass wordmark to be added as a small corner overlay afterward (don't bake text into the generated image itself).

- **`home-og.jpg`** — Same mood as the homepage hero: a warm, editorial shot of the Eiffel Tower or a European cityscape at dusk with a passport/travel document subtly in frame, landscape 1200×630.
- **`about-og.jpg`** — A warm portrait-style shot of the Flypass team or founder at a desk with documents, approachable and human, landscape 1200×630.
- **`destinations-og.jpg`** — A collage-friendly single image representing "Europe" broadly — e.g. a wide dusk shot of a European old-town square with several recognisable architectural cues (not one single country), landscape 1200×630.
- **`france-og.jpg`** — Same brief as `france-visa-appointment-uk-hero.webp` or the Eiffel Tower dusk shot, reused/cropped to landscape 1200×630.

---

### Two files that appear unused
`assets/france-appointment.webp` and `assets/france-centres-map.webp` aren't referenced by any page right now — flagging in case you want them wired in somewhere, or they can be deleted as leftovers.

### Not covered here
`assets/flypass-logo.png` is your brand mark (referenced only in structured data) — not a candidate for AI regeneration.
