"""Build the room-by-room RH consultation without changing the approved gallery."""

import argparse
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FLOORS = {1: ("Ground floor", "Entry, work & leisure"), 2: ("Main living floor", "Gather, cook & entertain"), 3: ("Bedroom floor", "Rest & daily routines"), 4: ("Penthouse", "Guests, lounge & terrace")}
ROOM_FLOORS = {1: "entry office media gym bath".split(), 2: "great kitchen dining living sunroom stair2".split(), 3: "ownerbed retreat ownerbath ownercloset bed2 bed3 sharedbath laundry stair3".split(), 4: "loft bed5 bath4 terrace".split()}


def floor_number(value, room_id=""):
    aliases = {"first-floor": 1, "second-floor": 2, "third-floor": 3, "penthouse": 4, "first": 1, "second": 2, "third": 3, "fourth": 4}
    if str(value).lower() in aliases:
        return aliases[str(value).lower()]
    match = re.search(r"[1-4]", str(value))
    if match:
        return int(match[0])
    return next((f for f, ids in ROOM_FLOORS.items() if room_id in ids), 1)


def txt(value):
    return escape(str(value or ""))


def safe_url(value):
    value = str(value or "").strip()
    if value.startswith("docs/"):
        value = "/" + value[5:]
    elif "/docs/" in value and value.startswith("/Users/"):
        value = "/" + value.split("/docs/", 1)[1]
    if value.startswith(("https://", "http://", "/", "./", "../", "#")):
        return value
    if value and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", value):
        return value
    return ""


def anchor(url, label, external=True):
    url = safe_url(url)
    if not url:
        return ""
    attrs = ' target="_blank" rel="noopener noreferrer"' if external else ""
    return f'<a href="{escape(url, quote=True)}"{attrs}>{txt(label)}{" ↗" if external else ""}</a>'


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def note_text(value):
    if isinstance(value, dict):
        name = value.get("name", value.get("title", value.get("topic", "")))
        body = value.get("description", value.get("reason", value.get("note", value.get("decision", ""))))
        return f"{name}: {body}" if name and body else str(name or body)
    return str(value)


def list_notes(values, class_name="note-list"):
    values = [note_text(v) for v in as_list(values) if note_text(v)]
    return f'<ul class="{class_name}">' + "".join(f"<li>{txt(v)}</li>" for v in values) + "</ul>" if values else ""


def product_card(p, alternative=False):
    name = p.get("name", "Furniture candidate")
    photo = safe_url(p.get("imageUrl", p.get("image")))
    url = safe_url(p.get("url"))
    is_rh = bool(re.search(r"^https?://(?:[^/]*\.)?rh\.com/", url))
    image = f'<img src="{escape(photo, quote=True)}" alt="{"RH product photograph" if is_rh else "Product photograph"}: {escape(name, quote=True)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">' if photo else '<div class="photo-pending">Product photograph unavailable<br><span>Open the official product page</span></div>' if url else '<div class="photo-pending">Supporting direction<br><span>Supplier and model to select</span></div>'
    quantity = p.get("quantity", p.get("proposedQuantity", ""))
    role = p.get("role", "Alternative" if alternative else "RH candidate")
    if quantity and not p.get("role"):
        role += f" · {quantity}"
    finish = p.get("proposedFinish", p.get("finish", ""))
    material = p.get("material", "")
    size = p.get("planningSize", p.get("size", p.get("planningTarget", "")))
    size_status = p.get("sizeStatus", "")
    phase = p.get("phase", "")
    price_status = p.get("priceConfigStatus", p.get("price", ""))
    reason = p.get("reason", p.get("why", ""))
    caution = p.get("purchaseCaution", "")
    details = ""
    if finish:
        details += f'<p class="finish">{txt(finish)}</p>'
    if material:
        details += f'<p class="meta"><strong>Material:</strong> {txt(material)}</p>'
    if size:
        details += f'<p class="meta"><strong>Planning fit:</strong> {txt(size)}</p>'
    if size_status:
        details += f'<p class="meta">{txt(size_status)}</p>'
    if phase:
        details += f'<p class="phase">{txt(phase)}</p>'
    if price_status:
        details += f'<p class="meta">{txt(price_status)}</p>'
    if caution:
        details += f'<p class="purchase-caution"><strong>Before purchase:</strong> {txt(caution)}</p>'
    sources = as_list(p.get("sourceUrls"))
    source_links = ""
    if sources:
        source_links = '<details class="product-sources"><summary>Research references</summary>' + "".join(f'<p>{anchor(v.get("url"), v.get("title", "RH reference")) if isinstance(v, dict) else anchor(v, "RH reference")}</p>' for v in sources) + "</details>"
    photo_note = "RH catalogue photograph. The displayed finish may differ from the proposed finish." if photo and is_rh else "Product photograph. Confirm the selected finish with the supplier." if photo else "Official product linked; catalogue photograph not supplied." if url else "Style direction only. A specific supplier, model and specification remain to be selected."
    return f'<article class="product-card"><div class="product-photo">{image}</div><div class="card-content"><p class="eyebrow">{txt(role)}</p><h3>{txt(name)}</h3>{details}<p>{txt(reason)}</p>{anchor(url, "View at RH" if is_rh else "View product")}<p class="photo-note">{photo_note}</p>{source_links}</div></article>'


def supporting_items(items, default_type="Custom / supporting"):
    cards = []
    for item in as_list(items):
        if not isinstance(item, dict):
            cards.append(f'<article class="support-card"><p>{txt(item)}</p></article>')
            continue
        name = item.get("name", item.get("title", "Supporting selection"))
        description = item.get("description", item.get("reason", item.get("note", "")))
        details = "".join(f'<p class="meta"><strong>{label}:</strong> {txt(item[field])}</p>' for field, label in [("material", "Material"), ("proposedFinish", "Finish"), ("planningSize", "Planning fit"), ("phase", "Phase")] if item.get(field))
        cards.append(f'<article class="support-card"><p class="eyebrow">{txt(item.get("type", default_type))}</p><h3>{txt(name)}</h3><p>{txt(description)}</p>{details}{anchor(item.get("url"), item.get("linkLabel", "Reference"))}</article>')
    return "".join(cards)


def render_views(room):
    render = room.get("render", {})
    if isinstance(render, str):
        render = {"src": render}
    views = []
    for key, source_key, label, caption_key, default_caption in [
        ("study", "src", "Furniture study", "caption", "Furniture consultation proposal. Product details and scale are illustrative; confirm samples and measured fit before purchasing."),
        ("current", "currentSrc", "Current Option 1", "currentCaption", "The current Mineral & Walnut design remains the approved architectural reference while furniture choices are reviewed."),
        ("original", "originalSrc", "Model-home reference", "originalCaption", "Original model-home photograph. Read it alongside the blueprint; measured conditions in your house govern the final layout and build."),
    ]:
        source = safe_url(render.get(source_key))
        if source:
            label = render.get("label", "Current Option 1" if source == safe_url(render.get("currentSrc")) else label) if key == "study" else label
            if any(v["src"] == source for v in views):
                continue
            views.append({"id": key, "src": source, "label": label, "caption": render.get(caption_key, default_caption), "alt": render.get("alt", f'{room.get("title", "Room")} — {label}') if key == "study" else f'{room.get("title", "Room")} — {label}'})
    return views


def window_notes(value):
    if not value:
        return ""
    if not isinstance(value, dict):
        return '<div class="window-notes"><h3>Window treatments</h3>' + list_notes(value) + "</div>"
    recommendation = value.get("recommendation", value.get("system", ""))
    rows = "".join(f'<p><strong>{label}:</strong> {txt(value[field])}</p>' for field, label in [("coverage", "Coverage"), ("why", "Why here"), ("day", "Daytime"), ("night", "At night"), ("installation", "Installation")] if value.get(field))
    return f'<details class="window-notes"><summary>Window treatments <span>· {txt(recommendation)}</span></summary><div>{rows}</div></details>'


def room_panel(room):
    room_id = room["id"]
    floor = room["floorNumber"]
    products = room.get("products", [])
    alternatives = room.get("alternatives", [])
    render = room.get("render", {}) if isinstance(room.get("render", {}), dict) else {}
    status = room.get("status", "Current Option 1 finish reference") if room.get("renderMode") == "reuse_current" else render.get("status", room.get("status", "Proposal for consultation"))
    custom = supporting_items(room.get("customItems", []), "Fitted / custom")
    supporting = supporting_items(room.get("supportingItems", []), "Supporting selection")
    independent = supporting_items(room.get("nonRhItems", []), "Source independently")
    if independent:
        supporting += independent
    views = render_views(room)
    image_tabs = "".join(f'<button type="button" class="image-tab" data-image-view="{v["id"]}" aria-pressed="{str(i == 0).lower()}">{txt(v["label"])}</button>' for i, v in enumerate(views))
    image_area = f'<div class="image-tabs" aria-label="Compare room images">{image_tabs}</div><figure class="room-figure"><div class="image-stage"><img class="room-image" alt="" decoding="async" fetchpriority="high"></div><figcaption class="room-caption"></figcaption></figure>' if views else '<div class="render-placeholder"><span>Room study</span><p>Image preparation is in progress.</p></div>'
    leading_intro = "Specific RH candidates to review. Final fabrics, finishes, size, current pricing and lead times remain to be configured."
    if not products and any(word in str(status).lower() for word in ("pending", "preparation")):
        products_html = '<div class="quiet-note"><h3>Furniture shortlist in preparation.</h3><p>The current room and model-home references are available while the room-specific recommendations are assembled.</p></div>'
    elif not products:
        products_html = '<div class="quiet-note"><h3>No loose RH furniture recommended.</h3><p>This space benefits from the fitted design and a clear, functional layout. The room reference and supporting notes below cover its role in the house.</p></div>'
    else:
        products_html = '<div class="product-grid">' + "".join(product_card(p) for p in products) + "</div>"
    alternatives_html = '<section id="alternatives" class="room-section"><p class="eyebrow">Other directions worth comparing</p><h2>Alternatives</h2><p class="section-intro">These are substitutes to discuss, rather than additional pieces to buy.</p><div class="product-grid">' + "".join(product_card(p, True) for p in alternatives) + "</div></section>" if alternatives else ""
    custom_html = f'<section id="supporting" class="room-section"><p class="eyebrow">Complete the room</p><h2>Fitted & supporting pieces</h2><p class="section-intro">Custom joinery and practical supporting selections are specified separately from the RH furniture shortlist.</p>{"<h3 class=group-heading>Fitted / custom work</h3><div class=support-grid>" + custom + "</div>" if custom else ""}{"<h3 class=group-heading>Supporting selections</h3><div class=support-grid>" + supporting + "</div>" if supporting else ""}</section>' if custom or supporting else ""
    layout = list_notes(room.get("layoutNotes", []))
    layout_html = f'<div class="fit-notes"><h3>Fit & layout</h3>{layout}</div>' if layout else '<div class="fit-notes"><h3>Fit before ordering</h3><p>Check the room on site, every opening, circulation and the delivery route before finalizing sizes.</p></div>'
    sources = as_list(room.get("sources", []))
    source_html = '<details class="room-sources"><summary>Sources & research notes</summary><ul>' + "".join(f'<li>{anchor(s.get("url"), s.get("title", s.get("name", "Reference"))) if isinstance(s, dict) and s.get("url") else txt(note_text(s)) if isinstance(s, dict) else anchor(s, "Reference") if safe_url(s).startswith(("http://", "https://")) else txt(s)}</li>' for s in sources) + "</ul></details>" if sources else ""
    locks = list_notes(room.get("architectureLocks", []))
    locks_html = f'<details class="room-sources"><summary>Architectural details retained</summary>{locks}</details>' if locks else ""
    evidence_html = f'<p class="evidence-note">{txt(render.get("evidenceType"))}</p>' if render.get("evidenceType") else ""
    great_link = '<a href="/design-library-assets/rh-great-room-consultation.html">Open the detailed first great-room study ↗</a>' if room_id == "great" else ""
    return f'''<article class="room-content" aria-labelledby="room-title">
<div class="room-heading"><div><p class="eyebrow">Floor {floor} · {txt(FLOORS[floor][0])}</p><h2 id="room-title">{txt(room.get("title", room_id))}</h2><p class="room-summary">{txt(room.get("designSummary", "Room-specific furniture consultation in the Mineral & Walnut palette."))}</p></div><div class="room-meta"><span class="status-pill">{txt(status)}</span><a href="/house-design-review.html#floor-{floor}/{escape(room_id, quote=True)}">View full house design ↗</a>{great_link}</div></div>
<nav class="section-nav" aria-label="This room"><a href="#floor-{floor}/{room_id}/study" data-section="study">Room study</a><a href="#floor-{floor}/{room_id}/pieces" data-section="pieces">Furniture</a>{'<a href="#floor-'+str(floor)+'/'+room_id+'/alternatives" data-section="alternatives">Alternatives</a>' if alternatives else ''}{'<a href="#floor-'+str(floor)+'/'+room_id+'/supporting" data-section="supporting">Supporting pieces</a>' if custom or supporting else ''}<a href="#floor-{floor}/{room_id}/phases" data-section="phases">Purchase phases</a></nav>
<section id="study" class="study-section">{image_area}{evidence_html}{layout_html}{window_notes(room.get("windowTreatment"))}</section>
<section id="pieces" class="room-section"><p class="eyebrow">The recommended mix</p><h2>{'Furniture shortlist' if products else 'Keep this space purposeful'}</h2>{f'<p class="section-intro">{leading_intro}</p>' if products else ''}{products_html}</section>
{alternatives_html}{custom_html}
<section id="phases" class="room-section"><p class="eyebrow">Finished design, phased purchasing</p><h2>What to buy & when</h2>{list_notes(room.get("purchaseNotes", []), "purchase-list")}<p class="budget-note">The $25,000 move-in furniture allowance covers essential pieces across multiple rooms, including tax, delivery and assembly. This full-room proposal is a phased shortlist; it does not increase that allowance or authorize an order.</p></section>
<div class="review-callout"><p class="eyebrow">Review together</p><h3>Tell me what feels right in this room.</h3><p>Use the room name and a piece name in the chat. We can keep the leading mix, swap in an alternative or adjust the comfort and proportions before developing the shopping specification.</p></div>{source_html}{locks_html}
<div class="room-footer"><button type="button" class="next-room">Next room <span aria-hidden="true">→</span></button><a href="#floor-{floor}/{room_id}" data-top-link>Back to floor navigation ↑</a></div></article>'''


def placeholder_data():
    book = ROOT / "docs/room-design-book.json"
    if not book.exists():
        return {"rooms": [], "status": "Consultation preparation in progress"}
    rooms = json.loads(book.read_text()).get("rooms", {})
    return {"rooms": [{"id": key, "title": value.get("title", key), "floor": value.get("floor", ""), "designSummary": "Furniture consultation preparation is in progress. The final room shortlist will appear here.", "render": {"status": "Preparation in progress"}, "products": []} for key, value in rooms.items()], "status": "Consultation preparation in progress"}


def build(data, output):
    rooms = data.get("rooms", [])
    if isinstance(rooms, dict):
        rooms = [dict(value, id=key) for key, value in rooms.items()]
    for room in rooms:
        room["id"] = re.sub(r"[^a-zA-Z0-9_-]", "-", str(room.get("id", "room")))
        room["floorNumber"] = floor_number(room.get("floor"), room["id"])
    floor_tabs = "".join(f'<button type="button" id="floor-tab-{floor}" role="tab" aria-selected="{str(floor == 1).lower()}" aria-controls="room-picker" tabindex="{0 if floor == 1 else -1}" data-floor="{floor}"><span>Floor {floor}</span><small>{txt(label[0])}</small></button>' for floor, label in FLOORS.items())
    templates = "".join(f'<template id="room-template-{room["id"]}">{room_panel(room)}</template>' for room in rooms)
    metadata = [{"id": r["id"], "title": r.get("title", r["id"]), "floor": r["floorNumber"], "views": render_views(r), "productCount": len(r.get("products", []))} for r in rooms]
    preferences = data.get("preferences", data.get("confirmedPreferences", []))
    if isinstance(preferences, dict):
        preferences = preferences.get("confirmedPreferences", preferences.get("decisions", [f"{key}: {value}" for key, value in preferences.items() if isinstance(value, str)]))
    preference_html = list_notes(preferences, "preference-list")
    scripts_data = json.dumps({"rooms": metadata}, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    html = PAGE.replace("__FLOOR_TABS__", floor_tabs).replace("__TEMPLATES__", templates).replace("__DATA__", scripts_data).replace("__ROOM_COUNT__", str(len(rooms))).replace("__PREFERENCES__", preference_html).replace("__DATE__", txt(data.get("date", "October 9, 2026")))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html)
    print(f"Built {output} — {len(rooms)} rooms, {sum(len(r.get('products', [])) for r in rooms)} recommended product placements")


PAGE = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="A room-by-room RH furniture consultation for Mineral & Walnut: furniture studies, specific candidates, layout cautions and phased purchasing for Home 708."><title>Whole-house RH consultation · Mineral & Walnut</title>
<style>
:root{--paper:#f4f1eb;--surface:#fffdfa;--ink:#2d2c26;--muted:#706a60;--line:#d9d2c7;--walnut:#6a4b33;--tint:#eae3d8;--soft:#efebe3}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:170px}body{margin:0;font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--paper);color:var(--ink)}a{color:inherit;text-underline-offset:4px}a:hover{color:var(--walnut)}button{font:inherit;cursor:pointer}button,a{touch-action:manipulation}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #a27f56;outline-offset:4px}button[disabled]{cursor:default}.topbar{border-bottom:1px solid var(--line);padding:15px 4vw;display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;font-size:13px}.topbar nav{display:flex;gap:24px;flex-wrap:wrap}.brand{text-decoration:none;font-weight:650;letter-spacing:.03em}.page-wrap{max-width:1480px;margin:auto;padding:0 4vw}.intro{padding:47px 0 29px;display:grid;grid-template-columns:1fr 320px;gap:48px}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--walnut);font-weight:650;margin:0 0 10px}h1,h2,h3{font-family:Georgia,"Times New Roman",serif;font-weight:400;line-height:1.15}h1{font-size:clamp(39px,4.4vw,67px);margin:0 0 21px;letter-spacing:-.02em}h2{font-size:clamp(31px,3vw,43px);margin:0 0 14px}h3{font-size:25px;margin:0 0 12px}.lead{color:var(--muted);font-size:18px;max-width:780px;margin:0 0 17px}.intro-note{font-size:13px;color:var(--muted);max-width:730px}.palette{display:flex;flex-wrap:wrap;gap:17px;margin-top:21px}.swatch{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted)}.swatch span{width:17px;height:17px;border-radius:50%;border:1px solid #bfb7aa}.preferences{border-left:1px solid var(--line);padding-left:26px;align-self:center}.preferences h2{font-family:inherit;font-size:12px;font-weight:650;letter-spacing:.1em;text-transform:uppercase;margin-bottom:13px}.preference-list{margin:0;padding-left:17px;color:var(--muted);font-size:13px}.preference-list li{margin:0 0 9px}.selection-bar{position:sticky;top:0;z-index:5;background:rgba(244,241,235,.98);border-block:1px solid var(--line);padding:14px 0 13px;box-shadow:0 7px 14px rgba(63,47,31,.035)}.selection-inner{max-width:1480px;margin:auto;padding:0 4vw}.floor-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.floor-tabs button{border:1px solid var(--line);background:transparent;border-radius:5px;display:flex;align-items:center;gap:12px;justify-content:center;padding:11px 12px;text-align:left}.floor-tabs button span{font-weight:650;font-size:13px}.floor-tabs button small{font-size:12px;color:var(--muted)}.floor-tabs button[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:var(--surface)}.floor-tabs button[aria-selected=true] small{color:#ded8cc}.room-picker{display:flex;gap:7px;overflow-x:auto;padding:12px 1px 4px;scrollbar-width:thin}.room-picker button{white-space:nowrap;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--muted);padding:6px 12px;font-size:13px;flex-shrink:0}.room-picker button:hover{background:var(--tint)}.room-picker button[aria-pressed=true]{background:var(--tint);border-color:#cec1ae;color:var(--ink);font-weight:600}.room-heading{display:grid;grid-template-columns:1fr auto;gap:30px;padding:35px 0 20px}.room-heading h2{font-size:43px}.room-summary{max-width:850px;color:var(--muted);margin:0;font-size:16px}.room-meta{display:flex;align-items:flex-end;flex-direction:column;gap:9px;font-size:12px;padding-top:2px;max-width:310px;text-align:right}.status-pill{border:1px solid var(--line);padding:4px 9px;border-radius:4px;font-size:11px;background:var(--surface)}.section-nav{display:flex;gap:22px;flex-wrap:wrap;margin:3px 0 24px;font-size:13px}.section-nav a{text-decoration:none;border-bottom:1px solid var(--line);padding-bottom:4px}.image-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.image-tab{background:transparent;border:1px solid var(--line);border-radius:999px;padding:8px 15px;font-size:12px}.image-tab[aria-pressed=true]{background:var(--walnut);border-color:var(--walnut);color:#fff}.room-figure{margin:0}.image-stage{background:#e6e0d6;aspect-ratio:3/2;overflow:hidden;border-radius:5px;position:relative}.room-image{width:100%;height:100%;object-fit:contain;display:block}.room-caption{font-size:12px;color:var(--muted);max-width:1090px;margin-top:12px}.render-placeholder{background:var(--tint);border-radius:5px;min-height:260px;display:flex;justify-content:center;align-items:center;flex-direction:column;color:var(--muted);border:1px solid var(--line)}.render-placeholder span{font-size:12px;text-transform:uppercase;letter-spacing:.1em}.render-placeholder p{font:27px Georgia,serif}.fit-notes{background:var(--soft);border-left:3px solid var(--walnut);padding:21px 26px;margin-top:25px}.fit-notes h3{font-size:23px}.note-list,.purchase-list{margin:0;padding-left:19px;font-size:14px;max-width:1120px}.note-list li,.purchase-list li{padding:2px 0;margin-bottom:7px}.room-section{padding-top:46px;scroll-margin-top:180px}.section-intro{max-width:850px;color:var(--muted);font-size:14px;margin:0 0 22px}.product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.product-card{background:var(--surface);border:1px solid var(--line);border-radius:5px;overflow:hidden}.product-photo{height:235px;background:#f8f7f4;padding:22px;display:flex;align-items:center;justify-content:center}.product-photo img{width:100%;height:100%;object-fit:contain}.photo-pending{font:20px/1.5 Georgia,serif;text-align:center;color:var(--muted)}.photo-pending span{font:12px system-ui,sans-serif}.card-content{padding:24px}.card-content h3{font-size:25px}.card-content p{font-size:14px;margin:0 0 12px}.card-content .eyebrow{font-size:10px}.card-content .finish{font-weight:650}.card-content .meta{font-size:12px;color:var(--muted);line-height:1.55}.card-content .phase{display:inline-block;border-radius:3px;background:var(--tint);padding:4px 8px;font-size:11px}.card-content>a{display:inline-block;font-size:13px;font-weight:600;margin:4px 0 12px}.card-content .photo-note{font-size:11px;color:var(--muted);line-height:1.5;margin:0}.product-sources{font-size:11px;color:var(--muted);margin-top:13px}.product-sources p{font-size:11px;margin:6px 0}.product-sources summary,.room-sources summary{cursor:pointer}.support-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.support-card{padding:24px;border:1px solid var(--line);border-radius:5px;background:#efe9df}.support-card h3{font-size:24px}.support-card p{font-size:14px;margin:0 0 12px}.support-card .meta{font-size:12px;color:var(--muted)}.support-card a{font-size:13px}.quiet-note{padding:27px;background:var(--soft);border:1px solid var(--line);border-radius:5px}.quiet-note p{font-size:14px;margin-bottom:0;max-width:800px}.budget-note{padding:17px 20px;border:1px solid var(--line);font-size:12px;color:var(--muted);margin:23px 0 0;border-radius:4px;max-width:1050px}.review-callout{background:var(--tint);padding:26px;border-radius:5px;margin-top:38px}.review-callout p:last-child{font-size:14px;max-width:950px;margin-bottom:0}.room-sources{margin:30px 0 0;font-size:12px;color:var(--muted)}.room-sources ul{padding-left:20px}.room-sources li{margin:9px 0;overflow-wrap:anywhere}.room-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding:33px 0}.room-footer a{font-size:12px}.next-room{border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:4px;padding:10px 17px;font-size:13px}.next-room:hover{background:var(--walnut);border-color:var(--walnut)}.next-room span{margin-left:10px}.global-footer{padding:35px 0 50px;color:var(--muted);font-size:12px}.global-footer p{max-width:1050px}.global-footer nav{display:flex;gap:22px;flex-wrap:wrap;margin-top:16px}.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.no-rooms{padding:50px 0;color:var(--muted)}
.card-content .purchase-caution{font-size:12px;padding:11px 12px;border-left:2px solid var(--walnut);background:var(--soft);line-height:1.55}.group-heading{font:600 12px/1.5 system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;margin:24px 0 12px;color:var(--walnut)}.evidence-note{font-size:11px;color:var(--muted);margin:9px 0 0}.window-notes{border:1px solid var(--line);border-radius:4px;padding:16px 20px;margin-top:18px;font-size:13px}.window-notes summary{cursor:pointer;font-weight:600}.window-notes summary span{font-weight:400;color:var(--muted)}.window-notes>div{padding-top:10px;max-width:1100px}.window-notes p{margin:9px 0}.window-notes h3{font-size:23px}
@media(min-width:1600px){.image-stage{max-height:820px;aspect-ratio:auto}.room-image{max-height:820px}}
@media(max-width:1000px){.intro{grid-template-columns:1fr;gap:22px}.preferences{border-left:0;border-top:1px solid var(--line);padding:18px 0 0}.preference-list{columns:2;column-gap:35px}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.floor-tabs button{display:block;text-align:center;padding:10px 8px}.floor-tabs button small{display:block;margin-top:2px}.room-heading{grid-template-columns:1fr}.room-meta{align-items:flex-start;text-align:left;max-width:none;gap:6px}.room-heading h2{font-size:38px}}
@media(max-width:650px){html{scroll-padding-top:156px}.topbar{padding:14px 6vw}.topbar nav{gap:15px}.topbar nav a{font-size:12px}.page-wrap,.selection-inner{padding-inline:6vw}.intro{padding:31px 0 24px}.lead{font-size:16px}h1{font-size:40px}.preference-list{columns:1;font-size:12px}.selection-bar{padding:10px 0 8px}.floor-tabs{gap:5px}.floor-tabs button{padding:8px 3px}.floor-tabs button span{font-size:12px}.floor-tabs button small{font-size:10px;line-height:1.3}.room-picker{padding-top:10px;gap:3px}.room-picker button{font-size:12px;padding:6px 10px}.room-heading{padding-top:27px;gap:16px}.room-heading h2{font-size:34px}.room-summary{font-size:14px}.section-nav{gap:12px 19px;font-size:12px;margin-bottom:20px}.image-tabs{gap:6px}.image-tab{font-size:11px;padding:7px 11px}.room-caption{font-size:11px}.product-grid,.support-grid{grid-template-columns:1fr;gap:17px}.product-photo{height:260px}.card-content{padding:22px}.fit-notes{padding:18px 20px}.note-list,.purchase-list{font-size:13px}.room-section{padding-top:35px;scroll-margin-top:160px}.review-callout{padding:22px}.room-footer{flex-wrap:wrap}.global-footer nav{gap:13px}.image-stage{border-radius:3px}.status-pill{font-size:10px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{scroll-behavior:auto!important}}
@media print{.topbar,.selection-bar,.section-nav,.image-tabs,.room-footer{display:none}.page-wrap{padding:0}.intro{padding-top:10px}.preferences{display:none}.product-grid{grid-template-columns:repeat(2,1fr)}.product-card,.support-card{break-inside:avoid}.room-heading{padding-top:20px}.room-section{padding-top:25px}.review-callout{display:none}body{background:white}.global-footer{padding-bottom:0}}
</style></head><body>
<header class="topbar"><a class="brand" href="/">HOME 708</a><nav aria-label="Site navigation"><a href="/">← Homepage</a><a href="/renders.html">Design options</a><a href="/house-design-review.html">Full house design</a></nav></header>
<div class="page-wrap"><section class="intro"><div><p class="eyebrow">Option 1 · Mineral & Walnut · RH consultation</p><h1>Furniture for the<br>whole house.</h1><p class="lead">A complete room-by-room proposal: RH for the pieces you feel every day, practical supporting selections and fitted work where the room needs it.</p><p class="intro-note">Explore __ROOM_COUNT__ spaces by floor. These studies extend the warm mineral walls, walnut, matte oak and quiet textiles of Option 1. Select the finished look now; buy in phases.</p><div class="palette"><div class="swatch"><span style="background:#eee5d7"></span>Warm ivory</div><div class="swatch"><span style="background:#baad98"></span>Oatmeal</div><div class="swatch"><span style="background:#805637"></span>Walnut</div><div class="swatch"><span style="background:#47413a"></span>Charcoal</div><div class="swatch"><span style="background:#667052"></span>Plants</div></div></div><aside class="preferences"><h2>Your confirmed brief</h2>__PREFERENCES__<p class="intro-note">Consultation proposals · no products ordered.<br>Exact configurations and site measurements come next.</p></aside></section></div>
<div class="selection-bar"><div class="selection-inner"><div class="floor-tabs" role="tablist" aria-label="Choose a floor">__FLOOR_TABS__</div><div class="room-picker" id="room-picker" role="tabpanel" aria-labelledby="floor-tab-1" aria-label="Rooms on the selected floor"></div></div></div>
<main class="page-wrap"><div id="active-room"></div><p id="navigation-announcement" class="visually-hidden" aria-live="polite" aria-atomic="true"></p><footer class="global-footer"><p><strong>A furniture consultation, not a purchasing specification.</strong> Rendered pieces are product-led visual approximations. Catalogue photos, selected finishes and actual fabrics can differ. Confirm dimensions, comfort, samples, prices, stock and delivery access before ordering. Custom work remains in the construction scope.</p><p>Research uses accessible official RH collection and product pages. It is not a claim that every RH SKU or live configuration has been audited. Product photography belongs to RH. Home 708 · Mineral & Walnut · __DATE__.</p><nav><a href="/interior-design-guide.html">Interior design guide</a><a href="/mineral-walnut-budget.html">Budget</a><a href="/mineral-walnut-roadmap.html">Renovation roadmap</a><a href="/design-library-assets/rh-great-room-consultation.html">First great-room consultation</a></nav></footer></main>
__TEMPLATES__
<script type="application/json" id="consultation-data">__DATA__</script>
<script>
(() => {
  const data = JSON.parse(document.getElementById('consultation-data').textContent);
  const rooms = data.rooms;
  const host = document.getElementById('active-room');
  const picker = document.getElementById('room-picker');
  const floorTabs = Array.from(document.querySelectorAll('[data-floor]'));
  let activeId = '';
  let activeFloor = 1;
  let preferredImage = 'study';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function roomHash(room, section = '') {
    return '#floor-' + room.floor + '/' + room.id + (section ? '/' + section : '');
  }
  function scrollToRoom() {
    const navigationHeight = document.querySelector('.selection-bar').offsetHeight;
    const target = host.getBoundingClientRect().top + window.scrollY - navigationHeight - 18;
    window.scrollTo({top: Math.max(0, target), behavior: reducedMotion ? 'auto' : 'smooth'});
  }
  function navigate(room, section = '', scroll = true) {
    const newHash = roomHash(room, section);
    if (location.hash === newHash) activate(scroll);
    else {
      location.hash = newHash;
      if (scroll) requestAnimationFrame(scrollToRoom);
    }
  }
  function showImage(room, viewId) {
    const view = room.views.find(v => v.id === viewId) || room.views[0];
    if (!view) return;
    const image = host.querySelector('.room-image');
    if (!image) return;
    image.src = view.src;
    image.alt = view.alt;
    host.querySelector('.room-caption').textContent = view.caption;
    host.querySelectorAll('[data-image-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.imageView === view.id)));
  }
  function renderPicker(floor, currentId) {
    picker.replaceChildren();
    picker.setAttribute('aria-labelledby', 'floor-tab-' + floor);
    rooms.filter(r => r.floor === floor).forEach(room => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = room.title;
      button.dataset.room = room.id;
      button.setAttribute('aria-pressed', String(room.id === currentId));
      button.addEventListener('click', () => navigate(room));
      picker.append(button);
    });
    const selected = picker.querySelector('[aria-pressed="true"]');
    if (selected) picker.scrollLeft = Math.max(0, selected.offsetLeft - picker.offsetLeft - 20);
  }
  function activate(scrollToNav = false) {
    if (!rooms.length) {
      host.innerHTML = '<p class="no-rooms">The room consultation is being prepared.</p>';
      return;
    }
    const hash = location.hash.replace(/^#/, '').split('/');
    const floorMatch = /^floor-([1-4])$/.exec(hash[0] || '');
    const requestedFloor = floorMatch ? Number(floorMatch[1]) : 2;
    const room = rooms.find(r => r.id === hash[1] && r.floor === requestedFloor) || rooms.find(r => r.id === 'great' && r.floor === requestedFloor) || rooms.find(r => r.floor === requestedFloor) || rooms[0];
    const section = hash[2] || '';
    const isNewRoom = activeId !== room.id;
    activeFloor = room.floor;
    floorTabs.forEach(button => {
      const selected = Number(button.dataset.floor) === activeFloor;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    renderPicker(activeFloor, room.id);
    if (isNewRoom) {
      activeId = room.id;
      host.replaceChildren(document.getElementById('room-template-' + room.id).content.cloneNode(true));
      showImage(room, preferredImage);
      host.querySelectorAll('[data-image-view]').forEach(button => button.addEventListener('click', () => {
        preferredImage = button.dataset.imageView;
        showImage(room, preferredImage);
      }));
      host.querySelector('.next-room').addEventListener('click', () => navigate(rooms[(rooms.indexOf(room) + 1) % rooms.length], '', true));
      host.querySelector('[data-top-link]').addEventListener('click', () => requestAnimationFrame(scrollToRoom));
      document.getElementById('navigation-announcement').textContent = 'Floor ' + room.floor + ': ' + room.title + '. ' + room.productCount + ' furniture candidates.';
      document.title = room.title + ' · RH consultation · Mineral & Walnut';
    }
    if (location.hash !== roomHash(room, section)) history.replaceState(null, '', roomHash(room, section));
    if (section && /^[a-z]+$/.test(section)) requestAnimationFrame(() => host.querySelector('#' + section)?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth', block: 'start'}));
    else if (scrollToNav) scrollToRoom();
  }
  floorTabs.forEach(button => {
    const chooseFloor = () => {
      const first = rooms.find(r => r.floor === Number(button.dataset.floor));
      if (first) navigate(first);
    };
    button.addEventListener('click', chooseFloor);
    button.addEventListener('keydown', event => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let index = floorTabs.indexOf(button);
      if (event.key === 'ArrowLeft') index = (index + floorTabs.length - 1) % floorTabs.length;
      if (event.key === 'ArrowRight') index = (index + 1) % floorTabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = floorTabs.length - 1;
      floorTabs[index].focus();
      const room = rooms.find(r => r.floor === Number(floorTabs[index].dataset.floor));
      if (room) navigate(room);
    });
  });
  picker.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.target.tagName !== 'BUTTON') return;
    event.preventDefault();
    const buttons = Array.from(picker.querySelectorAll('button'));
    let index = buttons.indexOf(event.target);
    if (event.key === 'ArrowLeft') index = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
    if (event.key === 'Home') index = 0;
    if (event.key === 'End') index = buttons.length - 1;
    buttons[index].focus();
  });
  window.addEventListener('hashchange', () => activate());
  activate();
})();
</script></body></html>'''


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "docs/mineral-walnut-rh-house.json")
    parser.add_argument("--out", type=Path, default=ROOT / "docs/design-library-assets/rh-house-consultation.html")
    args = parser.parse_args()
    source = args.data if args.data.is_absolute() else ROOT / args.data
    build(json.loads(source.read_text()) if source.exists() else placeholder_data(), args.out)
