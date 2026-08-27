#!/usr/bin/env python3
"""Content-based dedupe for project pages + logo reframing + olympia limits."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "projects"
OUT = ROOT / "public/images/projects"
MANIFEST = OUT / ".source-map.json"

LOGO_SOURCES = {
    "koelner-kulturrat": "Kulturrat Köln.png",
    "ewtc": "EWTC.png",
    "k1": "K1.png",
    "trebbau": "Trebbau.png",
    "colletro": "colletro.png",
    "jeunes-restaurateurs": "JeunesRestaurateurs.png",
    "koerners-gasthaus": "Körners.png",
    "padeldesk": "padeldesk_logo.png",
    "foersterstube": "Förster.png",
}

OLYMPia_ATHLETES = [
    ("Angelique Kerber", re.compile(r"angelique|kerber", re.I)),
    ("Georg Grozer", re.compile(r"georg|grozer|gregor", re.I)),
    ("Leo Neugebauer", re.compile(r"leo|neugebauer|moin", re.I)),
    ("Malaika Mihambo", re.compile(r"malaika|mihambo", re.I)),
    ("Timo Boll", re.compile(r"timoboll|timo.?boll", re.I)),
    ("Ehlers Wickler", re.compile(r"ehlers|wickler|eickler|beach", re.I)),
]

OLYMPia_LEGACY = {
    "case-olympia-2024-1.webp": "Ehlers Wickler",
    "case-olympia-2024-2.webp": "Ehlers Wickler",
    "case-olympia-2024-3.webp": "Angelique Kerber",
    "case-olympia-2024-4.webp": "Georg Grozer",
    "case-olympia-2024-5.webp": "Angelique Kerber",
    "case-olympia-2024-6.webp": "Georg Grozer",
    "case-olympia-2024-7.webp": "Malaika Mihambo",
    "case-olympia-2024-8.webp": "Leo Neugebauer",
    "case-olympia-2024-9.webp": "Timo Boll",
    "case-olympia-2024-10.webp": "Angelique Kerber",
}

SLUG_META = {
    "colletro": "Colletro",
    "dach-cs": "DACH CS",
    "ewtc": "EWTC",
    "formula-profifahrer": "Formula Profifahrer",
    "foersterstube": "Försterstube",
    "gruene-lev": "Grüne LEV",
    "jeunes-restaurateurs": "Jeunes Restaurateurs",
    "k1": "K1 Kommunikation",
    "koelner-kulturrat": "Kölner Kulturrat",
    "koelner-stadtbibliothek": "Kölner Stadtbibliothek",
    "koerners-gasthaus": "Körners Gasthaus",
    "markt-oberstdorf": "Markt Oberstdorf",
    "netcologne": "NetCologne",
    "olympia-2024": "Olympia 2024",
    "padeldesk": "PadelDesk",
    "pock-art": "pock.art",
    "studio-k": "Studio K",
    "trebbau": "Trebbau",
}


def dhash(im: Image.Image, size: int = 16) -> int:
    im = ImageOps.exif_transpose(im).convert("L").resize((size + 1, size), Image.Resampling.LANCZOS)
    px = list(im.getdata())
    bits = 0
    for row in range(size):
        for col in range(size):
            if px[row * (size + 1) + col] > px[row * (size + 1) + col + 1]:
                bits = (bits << 1) | 1
            else:
                bits <<= 1
    return bits


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def find_source(name: str) -> str:
    manifest = json.loads(MANIFEST.read_text())
    return manifest.get("outputs", {}).get(name, "")


def image_hash(path: Path) -> int | None:
    if not path.exists():
        return None
    try:
        with Image.open(path) as im:
            return dhash(im)
    except OSError:
        return None


def gallery_item(slug: str, src: str, label: str) -> str:
    title = SLUG_META.get(slug, slug)
    return f"""          <div class="project-gallery__item">
            <div class="media-reveal" data-reveal>
              <div class="media-reveal__mask">
                <div class="media-reveal__zoom">
                  <img class="media-reveal__img" src="{src}" alt="{title} — {label}" width="1600" height="1200" loading="lazy" />
                </div>
              </div>
            </div>
          </div>"""


def rebuild_gallery(html: str, slug: str, items: list[tuple[str, str]]) -> str:
    block = "\n".join(gallery_item(slug, src, label) for src, label in items)
    section = f"""      <section class="section project-gallery" data-section>
        <div class="container">
          <div class="project-gallery__head">
            <p class="section__label">Galerie</p>
            <h2 class="section__title" data-split>Ausgewählte Visuals</h2>
          </div>
          <div class="project-gallery__grid">
{block}
          </div>
        </div>
      </section>"""
    start = html.find('<section class="section project-gallery"')
    end = html.find("</section>", start) + len("</section>")
    return html[:start] + section + html[end:]


def chapter_refs(html: str, slug: str) -> set[str]:
    gallery_start = html.find('<section class="section project-gallery"')
    before = html[:gallery_start] if gallery_start != -1 else html
    refs = set(re.findall(r'src="(/images/projects/[^"]+)"', before))
    return {r for r in refs if f"case-{slug}-" in r or f"logo-{slug}" in r}


def dedupe_refs(refs: list[str], chapter: set[str], threshold: int = 10) -> list[str]:
    """Keep first occurrence per content group. Chapter refs always win."""
    kept: list[str] = []
    groups: list[tuple[int, str]] = []

    def priority(src: str) -> int:
        if src in chapter:
            return 0
        return 1

    ordered = sorted(refs, key=lambda s: (priority(s), s))

    for src in ordered:
        fname = Path(src).name
        path = OUT / fname
        h = image_hash(path)
        if h is None:
            continue

        duplicate = False
        for gh, kept_src in groups:
            if hamming(h, gh) <= threshold:
                duplicate = True
                break
        if duplicate:
            continue

        groups.append((h, src))
        kept.append(src)

    return kept


def olympia_athlete(src: str, fname: str) -> str:
    if fname in OLYMPia_LEGACY:
        return OLYMPia_LEGACY[fname]

    source = find_source(fname).lower()
    if "sport/" in source:
        folder = source.split("sport/", 1)[1].split("/", 1)[0]
        folder_map = {
            "angelique kerber": "Angelique Kerber",
            "georg": "Georg Grozer",
            "leoneugebauer": "Leo Neugebauer",
            "malaikamohambo": "Malaika Mihambo",
            "timoboll": "Timo Boll",
            "ehlers wickler": "Ehlers Wickler",
        }
        return folder_map.get(folder.lower(), folder)

    hay = f"{source} {fname} {src}".lower()
    for name, pat in OLYMPia_ATHLETES:
        if pat.search(hay):
            return name
    return "other"


def limit_olympia(refs: list[str], chapter: set[str], max_per: int = 2) -> list[str]:
    by_athlete: dict[str, list[str]] = defaultdict(list)
    for src in refs:
        fname = Path(src).name
        athlete = olympia_athlete(src, fname)
        by_athlete[athlete].append(src)

    kept: list[str] = []
    for athlete, items in by_athlete.items():
        chapter_items = [s for s in items if s in chapter]
        rest = [s for s in items if s not in chapter]
        selected = list(chapter_items)
        for src in rest:
            if len(selected) >= max_per:
                break
            if src not in selected:
                selected.append(src)
        kept.extend(selected)
    return sorted(set(kept), key=lambda s: s)


def label_for(src: str) -> str:
    fname = Path(src).name
    source = find_source(fname)
    if source:
        return Path(source).stem.replace("_", " ")
    return fname.replace(".webp", "").split("-")[-1]


def logo_fit(source: Path, dest: Path, tw: int = 960, th: int = 1200, pad: float = 0.14) -> None:
    im = ImageOps.exif_transpose(Image.open(source)).convert("RGBA")
    rgb = im.convert("RGB")
    bg = rgb.getpixel((2, 2))
    bbox = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).getbbox()
    if bbox:
        im = im.crop(bbox)
        rgb = im.convert("RGB")

    w, h = im.size
    max_w, max_h = tw * (1 - 2 * pad), th * (1 - 2 * pad)
    scale = min(max_w / w, max_h / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (tw, th), bg)
    x, y = (tw - nw) // 2, (th - nh) // 2
    canvas.paste(im, (x, y), im)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "WEBP", quality=86, method=6)
    print(f"logo {dest.name} from {source.name} ({nw}x{nh} on {tw}x{th})")


def reexport_logos() -> None:
    for slug, src_name in LOGO_SOURCES.items():
        src = None
        for p in ROOT.iterdir():
            if not p.is_file():
                continue
            if unicodedata.normalize("NFKD", p.name).casefold() == unicodedata.normalize("NFKD", src_name).casefold():
                src = p
                break
        if not src:
            print(f"WARN: logo source missing for {slug}: {src_name}")
            continue
        logo_fit(src, OUT / f"logo-{slug}.webp")


def process_project(html_path: Path) -> None:
    slug = html_path.stem
    html = html_path.read_text()
    chapter = chapter_refs(html, slug)

    gallery_start = html.find('<section class="section project-gallery"')
    if gallery_start == -1:
        return

    all_case = re.findall(r'src="(/images/projects/case-' + re.escape(slug) + r'-\d+\.webp)"', html)
    gallery_only = [r for r in all_case if r not in chapter]

    if slug == "olympia-2024":
        candidates = dedupe_refs(list(chapter) + gallery_only, chapter)
        kept = limit_olympia(candidates, chapter, max_per=2)
        gallery_items = [(src, label_for(src)) for src in kept if src not in chapter]
    else:
        kept = dedupe_refs(list(chapter) + gallery_only, chapter)
        gallery_items = [(src, label_for(src)) for src in kept if src not in chapter]

    html = rebuild_gallery(html, slug, gallery_items)
    html_path.write_text(html)
    print(f"{slug:28} chapter={len(chapter):2} gallery={len(gallery_items):2}")


def patch_kulturrat_chapter(html_path: Path) -> None:
    html = html_path.read_text()
    html = html.replace(
        'src="/images/projects/case-koelner-kulturrat-6.webp" alt="Kölner Kulturrat — Brand Cards"',
        'src="/images/projects/case-koelner-kulturrat-16.webp" alt="Kölner Kulturrat — Social Media"',
    )
    html_path.write_text(html)


def main() -> None:
    reexport_logos()
    patch_kulturrat_chapter(PROJECTS / "koelner-kulturrat.html")

    for html_path in sorted(PROJECTS.glob("*.html")):
        process_project(html_path)

    # Ensure bierdeckel stays in kulturrat gallery (without duplicate case-24)
    html_path = PROJECTS / "koelner-kulturrat.html"
    html = html_path.read_text()
    html = re.sub(
        r'\s*<div class="project-gallery__item">.*?case-koelner-kulturrat-24\.webp.*?</div>\s*\n',
        "\n",
        html,
        count=1,
        flags=re.S,
    )
    bierdeckel = "/images/projects/case-koelner-kulturrat-6.webp"
    if bierdeckel not in html:
        insert = gallery_item("koelner-kulturrat", bierdeckel, "Bierdeckel") + "\n"
        html = html.replace(
            "          </div>\n        </div>\n      </section>\n\n      <nav class=\"section project-nav\"",
            insert + "          </div>\n        </div>\n      </section>\n\n      <nav class=\"section project-nav\"",
        )
    html_path.write_text(html)
    print("Kulturrat gallery: removed case-24 duplicate, kept bierdeckel")


if __name__ == "__main__":
    main()
