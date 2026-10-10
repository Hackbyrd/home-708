"""Build a separate, sale-aware mixed-brand furniture consultation for Option 1."""

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("rh_consultation_layout", ROOT / "scripts/build-rh-house-consultation.py")
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)
txt, anchor, list_notes = layout.txt, layout.anchor, layout.list_notes
SOURCES = ["mixed-brand-first-outdoor-research.json", "mixed-brand-social-research.json", "mixed-brand-private-research.json"]
STOCKED = {"in_stock", "ready_to_ship"}
GENERATION_PATH = ROOT / "docs/collected-value-generation.json"
FUTURE_ROOMS = {"bed5", "bath4"}
SUPPORTING_STUDIES = {"gym", "bath", "stair2", "ownerbath", "ownercloset", "sharedbath", "laundry", "stair3", "bath4"}
RENDER_PLANNING_NOTES = {
    "entry": ["The compact pedestal table is a fitted/supporting direction, not a stock-verified catalogue selection."],
    "office": ["The ergonomic work chair, printer cabinet and fitted TV wall remain planning items; the stocked desk and visitor chairs are the selected furniture."],
    "dining": ["The dining table is a planning placeholder. Its exact stock has not been confirmed and it is excluded from the buy list and priced subtotal. Plan eight seats daily and two additional seats when the table is extended."],
    "living": ["The baby grand piano remains a separately sourced planning item, outside the furniture subtotal."],
    "sunroom": ["The stocked 72 × 38-inch table needs a full-size floor template with chairs and the terrace route checked before purchase."],
    "ownerbed": ["Bedding and the mattress are neutral styling placeholders; their exact products and availability remain to be selected. The low bed frame does not provide a confirmed under-bed LED installation.", "The bench, dresser, headwall and floating bedside cabinets illustrate retained or separately sourced supporting work. They are excluded from the stocked loose-furniture selections and priced subtotal."],
    "bed2": ["Bedding, the mattress and the compact fitted desk remain planning items. Confirm bedside-table heights and drawer, closet and entry clearance on site."],
    "bed3": ["Bedding and the mattress remain planning items. Confirm bedside-table heights and the compact bedroom circulation on site."],
    "loft": ["The coffee table, media cabinet and any additional accent seating illustrate retained or unconfirmed supporting pieces, rather than stock-verified selections. The selected shortlist covers the sofa, side table and rug; a compact coffee table still needs sourcing and measured fit."],
    "bed5": ["Future room concept: Bedroom 5 must be built and measured before any furniture order. Bedding and the mattress remain planning items."],
    "bath4": ["Future bathroom concept: confirm the measured plan and completed construction before sourcing supporting pieces."],
    "terrace": ["The stocked sofa and coffee table are larger than the original planning footprints. Template the three terrace zones and delivery route before purchase; this is a later-phase proposal.", "This single terrace angle may leave selected pieces outside the frame. The shortlist includes the 108-inch sofa, 60-inch coffee table, 72-inch dining table, six dining chairs and two lounge chairs; their three-zone arrangement requires an on-site layout check."],
}


def approved_render_jobs():
    """Only publish downloaded studies explicitly approved by the visual QA pass."""
    if not GENERATION_PATH.exists():
        return {}
    manifest = json.loads(GENERATION_PATH.read_text())
    result = {}
    for job in manifest.get("jobs", []):
        if job.get("status") != "completed" or job.get("qa", {}).get("approved") is not True:
            continue
        source = layout.safe_url(job.get("webSrc"))
        if not source.startswith("/design-review-assets/collected-value/"):
            continue
        if not (ROOT / "docs" / source.lstrip("/")).is_file():
            continue
        room_id = job.get("roomId")
        if room_id:
            result[room_id] = job
    return result


def render_caption(room):
    kind = "Lighting, materials and supporting-piece study" if room["id"] in SUPPORTING_STUDIES else "Selected Collected Value furniture in the approved Mineral & Walnut room setting"
    future = " Future construction concept." if room["id"] in FUTURE_ROOMS else ""
    return kind + "." + future + " AI product-led visual approximation; the catalogue photograph, exact configuration, samples and measured clearances govern the purchase."


def money(value):
    if not isinstance(value, (int, float)):
        return "Price pending"
    return f"${value:,.0f}" if float(round(value, 2)).is_integer() else f"${value:,.2f}"


def price_amount(product):
    price = product.get("unitPrice") or {}
    if price.get("low") != price.get("high") or price.get("kind") in {"starting", "range", "from"}:
        return None
    return price.get("low") if isinstance(price.get("low"), (int, float)) else None


def product_card(product):
    price = product.get("unitPrice") or {}
    amount = price_amount(product)
    price_text = money(amount) if amount is not None else (
        f'{money(price.get("low"))}–{money(price.get("high"))}' if price.get("low") is not None else "Configured price not verified"
    )
    quantity = product.get("quantity", 1)
    extension = f" · {quantity} × {money(amount)} = {money(quantity * amount)}" if amount is not None and isinstance(quantity, int) and quantity > 1 else ""
    sale = bool(product.get("saleVerified"))
    badge = '<span class="sale-badge">Selected configuration on sale</span>' if sale else ""
    regular = price.get("regular", price.get("regularReference"))
    regular_text = f'<span class="regular-price">Regular {money(regular)}</span>' if isinstance(regular, (int, float)) else ""
    availability = product.get("availability", {})
    status = availability.get("status", "unverified")
    status_text = {"in_stock": "In stock shown", "ready_to_ship": "Near-term shipping quoted"}.get(status, "Not selected · stock unconfirmed")
    source = availability.get("sourceUrl") or product.get("url")
    photo = layout.safe_url(product.get("imageUrl"))
    image = f'<img src="{txt(photo)}" alt="{txt(product.get("brand"))} product photograph: {txt(product.get("name"))}" loading="lazy" referrerpolicy="no-referrer">' if photo else '<div class="photo-pending">View the official product<br><span>Catalogue photograph not supplied</span></div>'
    notes = list_notes(product.get("fitNotes"), "fit-list")
    delivery = availability.get("delivery") or "Delivery timing for ZIP 20878 not quoted."
    phase = {"move-in": "Move-in priority", "later": "Later phase", "optional": "Optional"}.get(product.get("phase"), product.get("phase", "Later phase"))
    replacement = ', '.join(product.get("replaces", []))
    comparison = f'<p class="meta"><strong>Compared with RH:</strong> {txt(replacement)}</p>' if replacement else ""
    return f'''<article class="product-card mixed-product" data-brand="{txt(product.get('brand'))}" data-sale="{str(sale).lower()}"><div class="product-photo">{image}</div><div class="card-content">
<p class="eyebrow">{txt(product.get('brand'))} · {txt(product.get('role'))} · Qty {txt(quantity)}</p><h3>{txt(product.get('name'))}</h3>{badge}
<p class="product-price">{txt(price_text)}{regular_text}<small>{txt(extension)}</small></p><p class="meta">{txt(price.get('note'))}</p>
<p class="finish">{txt(product.get('finish'))}</p><p class="meta"><strong>Dimensions:</strong> {txt(product.get('dimensions'))}</p>
<div class="availability availability-{txt(status)}"><strong>{txt(status_text)}</strong><p>{txt(availability.get('evidence'))}</p><p>{txt(delivery)}</p><p class="stock-stamp">Checked {txt(availability.get('checkedAt', '2026-10-09'))} · {txt(availability.get('method'))}</p>{anchor(source, 'Stock evidence')}</div>
<p>{txt(product.get('reason'))}</p>{notes}{comparison}<p class="phase">{txt(phase)}</p>{anchor(product.get('url'), 'View at ' + product.get('brand', 'retailer'))}
<p class="photo-note">Product photography may show another finish. Prices exclude tax, delivery and assembly. Stock for the complete house quantity and delivery to 20878 must be rechecked before purchase.</p></div></article>'''


def room_views(room):
    render = room.get("render", {})
    views = []
    if render.get("collectedValueSrc"):
        views.append({"id": "collected", "src": render["collectedValueSrc"], "label": "Collected Value room render", "caption": render.get("collectedValueCaption", render_caption(room)), "alt": room["title"] + " — Collected Value furniture study"})
    for key, label in [("currentSrc", "Option 1 design reference"), ("originalSrc", "Original model home")]:
        if render.get(key):
            if key == "originalSrc" and "no room photograph" in render.get("evidenceType", "").lower():
                label = "Plan reference"
            views.append({"id": "current" if key == "currentSrc" else "original", "src": render[key], "label": label,
                          "caption": "Approved Option 1 architecture and finish reference, retained for comparison with the new furniture study." if key == "currentSrc" else "Plan-led architectural reference; no original room photograph is available." if label == "Plan reference" else "Original model-home photograph; measured conditions and the blueprint govern fit.", "alt": room["title"] + " — " + label})
    return views


def room_panel(room):
    rid, floor = room["id"], room["floorNumber"]
    selected = [p for p in room["products"] if p["decision"] == "recommended"]
    alternatives = [p for p in room["products"] if p["decision"] == "alternative" and p["availability"]["status"] in STOCKED]
    pending = [p for p in room["products"] if p["availability"]["status"] not in STOCKED]
    views = room_views(room)
    image_tabs = ''.join(f'<button class="image-tab" type="button" data-image-view="{v["id"]}" aria-pressed="{str(i == 0).lower()}">{txt(v["label"])}</button>' for i, v in enumerate(views))
    image_area = f'<div class="image-tabs" role="group" aria-label="Compare room images">{image_tabs}</div><figure class="room-figure"><div class="image-stage"><img class="room-image" alt="" decoding="async" fetchpriority="high"></div><figcaption class="room-caption"></figcaption></figure>' if views else ""
    study_label = "Lighting, materials & supporting pieces" if rid in SUPPORTING_STUDIES else "Furniture in the room"
    if rid in FUTURE_ROOMS:
        study_label = "Future construction concept"
    study_heading = "Collected Value room render" if room.get("render", {}).get("collectedValueSrc") else "Approved room reference · render preparation"
    planning_notes = RENDER_PLANNING_NOTES.get(rid, [])
    render_notes = f'<div class="render-planning"><strong>Planning details shown</strong>{list_notes(planning_notes)}</div>' if planning_notes else ""
    evidence = f'<p class="evidence-note">{txt(room.get("render", {}).get("evidenceType"))}</p>' if room.get("render", {}).get("evidenceType") else ""
    selected_cards = ''.join(product_card(p) for p in selected)
    if not selected_cards:
        selected_cards = '<div class="quiet-note"><h3>Keep the fitted design and clear circulation.</h3><p>No stocked loose-furniture purchase is selected for this space. The notes below explain any measured sourcing still needed.</p></div>'
    selected_total = sum(price_amount(p) * p["quantity"] for p in selected if price_amount(p) is not None and isinstance(p["quantity"], int))
    missing_prices = sum(price_amount(p) is None for p in selected)
    budget = f'<p class="room-subtotal">Priced selections: <strong>{money(selected_total)}</strong> before tax and delivery.{f" {missing_prices} selected price(s) still unverified." if missing_prices else ""} Supporting directions and fitted work are excluded.</p>' if selected else ""
    alt_html = f'<section id="alternatives" class="room-section"><p class="eyebrow">Stocked substitutes · choose instead</p><h2>Other stocked choices</h2><p class="section-intro">Alternatives are excluded from the room subtotal.</p><div class="product-grid">{"".join(product_card(p) for p in alternatives)}</div></section>' if alternatives else ""
    pending_rows = ''.join('<li>' + anchor(p.get('url'), p['brand'] + ' · ' + p['name']) + ': ' + txt(p['availability'].get('evidence', 'No exact stock signal verified')) + '</li>' for p in pending)
    pending_html = '<details class="room-sources"><summary>Not selected: stock checks still incomplete</summary><p>Research candidates only. These are excluded from the stocked shortlist and prices below.</p><ul>' + pending_rows + '</ul></details>' if pending else ""
    custom = layout.supporting_items(room.get("customItems"), "Retained fitted work")
    original = anchor(f'/design-library-assets/rh-house-consultation.html#floor-{floor}/{rid}/pieces', 'Compare original RH-only room', False)
    return f'''<article class="room-content" aria-labelledby="room-title"><div class="room-heading"><div><p class="eyebrow">Floor {floor} · {txt(layout.FLOORS[floor][0])}</p><h2 id="room-title">{txt(room['title'])}</h2><p class="room-summary">{txt(room['designSummary'])}</p></div><div class="room-meta"><span class="status-pill">Collected Value · separate furniture version</span>{original}{anchor(f'/house-design-review.html#floor-{floor}/{rid}', 'Approved Option 1 design', False)}</div></div>
<nav class="section-nav" aria-label="This room"><a href="#floor-{floor}/{rid}/study">Room render</a><a href="#floor-{floor}/{rid}/pieces">Selected pieces</a>{f'<a href="#floor-{floor}/{rid}/alternatives">Stocked alternatives</a>' if alternatives else ''}<a href="#floor-{floor}/{rid}/supporting">Small pieces & fitted work</a><a href="#floor-{floor}/{rid}/phases">Purchase phases</a></nav>
<section id="study" class="study-section"><p class="eyebrow">{txt(study_label)}</p><h2>{txt(study_heading)}</h2>{image_area}{evidence}{render_notes}<div class="fit-notes"><h3>Fit & layout</h3>{list_notes(room.get('layoutNotes'))}</div>{layout.window_notes(room.get('windowTreatment'))}</section>
<section id="pieces" class="room-section"><p class="eyebrow">Value first · sale when the configuration fits</p><h2>The recommended mix</h2><p class="section-intro">{txt(room.get('comparisonToRh'))}</p><div class="brand-filters" role="group" aria-label="Filter product cards by retailer"><button type="button" data-brand-filter="all" aria-pressed="true">All brands</button>{''.join(f'<button type="button" data-brand-filter="{txt(b)}" aria-pressed="false">{txt(b)}</button>' for b in sorted({p['brand'] for p in selected + alternatives}))}<button type="button" data-sale-filter aria-pressed="false">Sale only</button></div><p class="filter-empty" hidden>No matching choices in this room. Clear the filters to see the full shortlist.</p>{budget}<div class="product-grid">{selected_cards}</div></section>{alt_html}{pending_html}
<section id="supporting" class="room-section"><p class="eyebrow">Finish the room without clutter</p><h2>Small pieces & fitted work</h2>{list_notes(room.get('supportingPlan'))}{f'<div class="support-grid">{custom}</div>' if custom else ''}</section>
<section id="phases" class="room-section"><p class="eyebrow">Select the scheme now · purchase in phases</p><h2>What to buy & when</h2>{list_notes(room.get('purchaseNotes'))}<p class="budget-note">The $25,000 whole-house move-in furniture allowance remains separate from the finished-room shortlist. Confirm stock, full quantities, fit and a delivery date after November 3 possession. Bedroom 5 waits for completed construction and measurement.</p></section>
<details class="room-sources"><summary>Architectural details retained</summary>{list_notes(room.get('architectureLocks'))}</details><div class="room-footer"><button type="button" class="next-room">Next room →</button><a href="#floor-{floor}/{rid}" data-top-link>Back to floor navigation ↑</a></div></article>'''


EXTRA_CSS = '''
.brand-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}.brand-filters button{border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:7px 13px;font-size:12px}.brand-filters button[aria-pressed=true]{background:var(--ink);color:white}.sale-badge{display:inline-block;background:#e5ebdc;color:#354e30;font-size:11px;border-radius:3px;padding:4px 8px;margin:0 0 12px}.card-content .product-price{font-size:22px;font-weight:600}.product-price small{display:block;font-size:12px;font-weight:400}.regular-price{font-size:12px;color:var(--muted);font-weight:400;display:block}.fit-list{padding-left:18px;font-size:12px;color:var(--muted)}.room-subtotal{background:var(--tint);padding:13px 18px;font-size:13px}.version-links{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.version-links a{border:1px solid var(--line);padding:9px 14px;text-decoration:none;border-radius:4px;font-size:13px}.version-links a[aria-current=page]{background:var(--ink);color:white}.shopping-summary{margin:28px 0;border:1px solid var(--line);border-radius:5px;padding:24px;background:var(--surface)}.shopping-summary summary{cursor:pointer;font-weight:600}.shopping-summary table{border-collapse:collapse;width:100%;font-size:13px;margin-top:16px}.shopping-summary th,.shopping-summary td{text-align:left;border-bottom:1px solid var(--line);padding:12px 10px}.shopping-summary th:last-child,.shopping-summary td:last-child{text-align:right}.table-scroll{overflow-x:auto}.filter-empty{font-size:13px;color:var(--muted)}[hidden]{display:none!important}.product-grid:has(.mixed-product[hidden]){align-items:start}.render-planning{border:1px solid var(--line);background:var(--surface);border-radius:4px;padding:16px 20px;margin-top:18px;font-size:13px}.render-planning .note-list{margin-top:9px;font-size:13px}.study-section{scroll-margin-top:180px}.render-progress{font-size:13px;color:var(--muted);margin:15px 0 0}
'''

FILTER_SCRIPT = '''<script>
document.addEventListener('click', event => {
  const button = event.target.closest('[data-brand-filter],[data-sale-filter]');
  if (!button) return;
  const host = document.getElementById('active-room');
  if (button.hasAttribute('data-brand-filter')) host.querySelectorAll('[data-brand-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  else button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  const brand = host.querySelector('[data-brand-filter][aria-pressed="true"]').dataset.brandFilter;
  const salesOnly = host.querySelector('[data-sale-filter]').getAttribute('aria-pressed') === 'true';
  let visible = 0;
  host.querySelectorAll('.mixed-product').forEach(card => {
    card.hidden = (brand !== 'all' && card.dataset.brand !== brand) || (salesOnly && card.dataset.sale !== 'true');
    if (!card.hidden) visible++;
  });
  host.querySelector('.filter-empty').hidden = visible > 0;
});
</script>'''


def main():
    base = json.loads((ROOT / "docs/mineral-walnut-rh-house.json").read_text())
    render_jobs = approved_render_jobs()
    fragments, research = {}, []
    for name in SOURCES:
        source = json.loads((ROOT / "docs" / name).read_text())
        research.extend(source.get("researchScope", []))
        for room in source["rooms"]:
            if room["id"] in fragments:
                raise ValueError(f'Duplicate researched room {room["id"]}')
            fragments[room["id"]] = room
    valid_ids = {r["id"] for r in base["rooms"]}
    if set(fragments) != valid_ids:
        raise ValueError(f'Room coverage mismatch: missing {valid_ids - set(fragments)}, unexpected {set(fragments) - valid_ids}')
    rooms = []
    for original in base["rooms"]:
        fragment = fragments[original["id"]]
        room = {key: original.get(key) for key in ["id", "title", "floor", "layoutNotes", "customItems", "architectureLocks", "windowTreatment", "render"]}
        room.update(fragment)
        room["floorNumber"] = layout.floor_number(room["floor"], room["id"])
        room["render"] = dict(room.get("render") or {})
        job = render_jobs.get(room["id"])
        if job:
            room["render"].update({
                "collectedValueSrc": job["webSrc"],
                "collectedValueJobId": job["job_id"],
                "collectedValueCaption": job.get("renderCaption") or render_caption(room),
                "collectedValueQa": job["qa"],
            })
        room["renderPlanningNotes"] = RENDER_PLANNING_NOTES.get(room["id"], [])
        for product in room.get("products", []):
            product.setdefault("quantity", 1)
            product.setdefault("decision", "alternative")
            product.setdefault("availability", {"status": "unverified"})
            if product["decision"] == "recommended" and product["availability"]["status"] not in STOCKED:
                product["decision"] = "pending"
            price = product.get("unitPrice") or {}
            product["saleVerified"] = bool(price.get("kind") in {"sale", "clearance", "member_sale"} and price_amount(product) is not None)
        rooms.append(room)
    selected = [p for r in rooms for p in r["products"] if p["decision"] == "recommended"]
    total = round(sum(price_amount(p) * p["quantity"] for p in selected if price_amount(p) is not None and isinstance(p["quantity"], int)), 2)
    rendered_count = sum(bool(r["render"].get("collectedValueSrc")) for r in rooms)
    result = {"title": "Mineral & Walnut · Collected Value", "version": "mixed-brand-sale-first-01", "date": "2026-10-10", "destinationZip": "20878", "originalVersion": "rh-house-consultation.html", "preferences": ["Prioritize value throughout", "Stocked pieces only", "Prioritize sale items", "Keep original Mineral & Walnut palette and room layouts", "Buy the finished-house design in phases; nothing ordered"], "researchScope": research, "summary": {"selectedPlacements": len(selected), "salePlacements": sum(p["saleVerified"] for p in selected), "pricedSelectionsSubtotal": total, "unpricedPlacements": sum(price_amount(p) is None for p in selected), "renderedRooms": rendered_count, "brands": sorted({p["brand"] for p in selected})}, "rooms": rooms}
    (ROOT / "docs/mineral-walnut-collected-value.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    floor_tabs = ''.join(f'<button type="button" id="floor-tab-{floor}" role="tab" aria-selected="{str(floor == 1).lower()}" aria-controls="room-picker" tabindex="{0 if floor == 1 else -1}" data-floor="{floor}"><span>Floor {floor}</span><small>{txt(label[0])}</small></button>' for floor, label in layout.FLOORS.items())
    templates = ''.join(f'<template id="room-template-{r["id"]}">{room_panel(r)}</template>' for r in rooms)
    metadata = [{"id": r["id"], "title": r["title"], "floor": r["floorNumber"], "views": room_views(r), "productCount": len(r["products"])} for r in rooms]
    rows = ''
    for room in rooms:
        room_link = anchor('#floor-' + str(room['floorNumber']) + '/' + room['id'] + '/pieces', room['title'], False)
        picks = [p for p in room['products'] if p['decision'] == 'recommended']
        subtotal = sum(price_amount(p) * p['quantity'] for p in picks if price_amount(p) is not None and isinstance(p['quantity'], int))
        rows += f'<tr><td>{room_link}</td><td>{len(picks)}</td><td>{money(subtotal)}</td></tr>'
    render_progress = f"{rendered_count} of {len(rooms)} room studies ready. Select a room to compare its Collected Value render with the approved Option 1 reference." if rendered_count else "Room studies are being prepared; the approved Option 1 references remain available for comparison."
    overview = f'''<nav class="version-links" aria-label="Furniture versions"><a href="rh-house-consultation.html">Original RH-only version</a><a href="collected-value-consultation.html" aria-current="page">Collected Value · mixed brands</a></nav><div class="stock-overview"><strong>Sale first · stocked configurations · checked October 9, 2026</strong><p>Research spans RH, Arhaus, Crate & Barrel and Pottery Barn. Warm materials, useful proportions and value govern the shortlist. Selected items have an observed stock signal or a near-term shipping quote; each card states the evidence. A shipping quote is not a warehouse inventory count.</p><p>Remaining sourcing gaps: the ten-seat formal dining table, office work chair, bedroom linens and mattresses, and several compact supporting pieces. Room renders identify these planning placeholders. The stocked sunroom table has a deeper footprint that needs a room template. Pending candidates remain linked for comparison, outside the buy list.</p><p>Sale labels apply only to the priced configuration shown. RH member prices require membership; membership, tax and delivery are excluded. No products ordered. October delivery estimates precede November 3 possession; future availability is not reserved.</p></div><p class="render-progress">{txt(render_progress)}</p><details class="shopping-summary"><summary>{len(selected)} selected placements · {result['summary']['salePlacements']} sale placements · priced selections {money(total)}</summary><p>Partial goods subtotal, before tax, delivery and assembly. {result['summary']['unpricedPlacements']} selected price(s) unverified. Alternatives, fitted work, appliances, piano, curtains and unnamed supporting pieces are excluded; this is not the complete house cost or the $25,000 move-in basket.</p><div class="table-scroll"><table><thead><tr><th>Room</th><th>Selected products</th><th>Priced selections</th></tr></thead><tbody>{rows}</tbody></table></div></details>'''
    page = layout.PAGE
    replacements = {
        "Whole-house RH consultation": "Collected Value furniture consultation",
        "A room-by-room RH furniture consultation for Mineral & Walnut: furniture studies, specific candidates, layout cautions and phased purchasing for Home 708.": "A separate mixed-brand, sale-first furniture consultation for Mineral & Walnut, with stocked choices from RH, Arhaus, Crate & Barrel and Pottery Barn.",
        "Option 1 · Mineral & Walnut · RH consultation": "Option 1 · Mineral & Walnut · Collected Value",
        "Furniture for the<br>whole house.": "A considered home.<br>A better-value mix.",
        "A complete room-by-room proposal: RH for the pieces you feel every day, practical supporting selections and fitted work where the room needs it.": "A fresh room-by-room furniture version: warm materials, good proportions and dated availability checks, with sale items given priority.",
        "These studies extend the warm mineral walls, walnut, matte oak and quiet textiles of Option 1.": "The original RH-only consultation stays intact. This version keeps Option 1’s warm mineral walls, walnut, matte oak and quiet textiles.",
        "Consultation proposals · no products ordered.<br>Exact configurations and site measurements come next.": "Stock is a dated configuration snapshot. Fit, complete quantities and delivery dates are checked before any order.",
        "<strong>A furniture consultation, not a purchasing specification.</strong> Rendered pieces are product-led visual approximations. Catalogue photos, selected finishes and actual fabrics can differ. Confirm dimensions, comfort, samples, prices, stock and delivery access before ordering. Custom work remains in the construction scope.": "<strong>Collected Value is a separate furniture consultation.</strong> Its new room renders are AI product-led visual approximations of the selected mix. The official catalogue photographs, exact configurations and measured clearances govern purchase. Planning placeholders and future-room concepts are labelled per room. Confirm samples, comfort, full quantities and delivery access before ordering. Fitted construction remains separate.",
        "Research uses accessible official RH collection and product pages. It is not a claim that every RH SKU or live configuration has been audited. Product photography belongs to RH.": "Research spans accessible official product and collection pages across the four retailers. This is a curated room-by-room shortlist; every SKU across their catalogues has not been audited. Photography belongs to the respective retailer.",
        "First great-room consultation": "Original RH-only version",
        "/design-library-assets/rh-great-room-consultation.html": "/design-library-assets/rh-house-consultation.html",
        " · RH consultation · Mineral & Walnut": " · Collected Value · Mineral & Walnut",
        "let preferredImage = 'study';": "let preferredImage = 'collected';",
    }
    for old, new in replacements.items():
        page = page.replace(old, new)
    page = page.replace("__FLOOR_TABS__", floor_tabs).replace("__TEMPLATES__", templates).replace("__DATA__", json.dumps({"rooms": metadata}, ensure_ascii=False).replace("<", "\\u003c")).replace("__ROOM_COUNT__", str(len(rooms))).replace("__PREFERENCES__", list_notes(result["preferences"], "preference-list")).replace("__DATE__", result["date"]).replace("__STOCK_OVERVIEW__", overview).replace("</style>", EXTRA_CSS + "</style>").replace("</body>", FILTER_SCRIPT + "</body>")
    output = ROOT / "docs/design-library-assets/collected-value-consultation.html"
    output.write_text(page)
    print(f"Built {output}: {len(rooms)} rooms, {len(selected)} selected placements, {result['summary']['salePlacements']} sale placements")


if __name__ == "__main__":
    main()
