#!/usr/bin/env python3
"""Sync source images from portfolio2 root + Sport/ into public/images/projects."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/images/projects"
MANIFEST = OUT / ".source-map.json"
PROJECTS_DIR = ROOT / "projects"

CARD = (960, 1344)
SKIP_DIRS = {"node_modules", "dist", "public", ".git", "scripts"}

SLUG_META = {
    "colletro": ("Colletro", "Colletro"),
    "dach-cs": ("DACH CS", "DACH CS Masters"),
    "ewtc": ("EWTC", "EWTC"),
    "formula-profifahrer": ("Formula Profifahrer", "Formula Profifahrer"),
    "foersterstube": ("Försterstube", "Försterstube"),
    "gruene-lev": ("Grüne LEV", "Grüne LEV"),
    "jeunes-restaurateurs": ("Jeunes Restaurateurs", "JRE"),
    "k1": ("K1 Kommunikation", "K1"),
    "koelner-kulturrat": ("Kölner Kulturrat", "Kulturrat"),
    "koelner-stadtbibliothek": ("Kölner Stadtbibliothek", "Stadtbibliothek"),
    "koerners-gasthaus": ("Körners Gasthaus", "Körners"),
    "markt-oberstdorf": ("Markt Oberstdorf", "Oberstdorf"),
    "netcologne": ("NetCologne", "NetCologne"),
    "olympia-2024": ("Olympia 2024", "Olympia 2024"),
    "padeldesk": ("PadelDesk", "PadelDesk"),
    "pock-art": ("pock.art", "pock.art"),
    "studio-k": ("Studio K", "Studio K"),
    "trebbau": ("Trebbau", "Trebbau"),
}

LOGO_ONLY = {
    "k1.png",
    "ewtc.png",
    "jeunesrestaurateurs.png",
    "trebbau.png",
    "colletro.png",
    "padeldesk_logo.png",
    "körners.png",
    "koerners.png",
    "kulturrat köln.png",
    "kulturrat.png",
    "förster.png",
}

STOCK_PATTERNS = [
    r"01 free minimal macbook",
    r"409 free",
    r"falling-plastic",
    r"free concert poster",
    r"free iphone 15 mockup",
    r"mockuuups free",
    r"business_cards_on_concrete",
    r"poster mockup set",
    r"black_frame_citylight",
    r"gutscheinkarte_mockup",
    r"mockup_guide 1",
    r"01 free iphone 15 pro on rock",
    r"01 landscape softcover book mockup",
    r"macbook pro mockup 2",
    r"sharingmoments_flyer_mockup",
    r"visitenkarte2",
    r"mockupliebedeineagenturpostkarte",
    r"posterall\.png",
    r"zieledefinieren",
    r"8bdddf_",
]

RULES: list[tuple[str, str]] = [
    (r"sport/|\.psd$|timoboll|malai|leoneuge|ehlers|wickler|kerber|grozer|mohambo|angelique|georg", "olympia-2024"),
    (r"kulturrat|kkr|handys_kkr|mockup5_kulturrat|ockup_kulturrat|brandbook.*kultur|kölnerkulturrat", "koelner-kulturrat"),
    (r"ewtc|jerseyewtc|laptoptasche|ewtc_schild|ewtc_keychain|ewtc_3|ewtcbrandbook|ewtcstation", "ewtc"),
    (r"studiok|studio_k|studiok_vk|studiok1", "studio-k"),
    (r"oberstdorf|socken\.png|miami3|wall poster mockup", "markt-oberstdorf"),
    (r"trebbau|gkpl", "trebbau"),
    (r"k1komm|k1 laptop|k1laptop", "k1"),
    (r"dach-cs|dachcs|img_2609|img_2732|b2\.png", "dach-cs"),
    (r"stadtbib|allyoucanbib|nps09037|nps07456|dsc08515|nps09016|dsc08319|img_3637", "koelner-stadtbibliothek"),
    (r"gruene.?lev|flyergruenelev|gruene2|gruene3|gruene_lev", "gruene-lev"),
    (r"netcologne|flyerncmockup|ncmockup", "netcologne"),
    (r"foerster|förster|förster|forsterstube_schild|fs_koelsch", "foersterstube"),
    (r"koerners|kornersmockup|brandbook.*korners", "koerners-gasthaus"),
    (r"jeunes|jre|posterjre|jremagazin", "jeunes-restaurateurs"),
    (r"formula|formulaprofifahrer|monaco mockup|brazilien1|whatsapp image 2026-08-09", "formula-profifahrer"),
    (r"pockart|pock\.art|pock art", "pock-art"),
    (r"padeldesk|padelbox|1040414|ewtc2\.png", "padeldesk"),
    (r"colletro", "colletro"),
    (r"whatsapp image 2026-08-27", "formula-profifahrer"),
    (r"mockup3\.png$|mockup4\.png$|mockup12\.png$", "studio-k"),
    (r"jutebeutel", "koelner-kulturrat"),
    (r"1657\.png$", "k1"),
]


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def is_stock(name: str) -> bool:
    n = name.lower()
    return any(re.search(p, n) for p in STOCK_PATTERNS)


def map_slug(path: Path) -> str | None:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    if path.suffix.lower() == ".psd":
        return None
    if norm(path.name) in {norm(x) for x in LOGO_ONLY}:
        return None
    if norm(path.name) == "nicoportrait":
        return None
    if is_stock(path.name):
        return None
    if "life-deck/out" in rel:
        return None

    hay = unicodedata.normalize("NFKD", f"{rel} {path.stem}").encode("ascii", "ignore").decode("ascii").lower()
    for pattern, slug in RULES:
        if re.search(pattern, hay, re.I):
            return slug
    return None


def cover(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    target, current = tw / th, w / h
    if current > target:
        nw = int(h * target)
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    else:
        nh = int(w / target)
        top = (h - nh) // 2
        im = im.crop((0, top, w, top + nh))
    return im.resize((tw, th), Image.Resampling.LANCZOS)


def avg_hash(im: Image.Image, size: int = 12) -> tuple[int, ...]:
    im = ImageOps.exif_transpose(im).convert("L").resize((size, size), Image.Resampling.LANCZOS)
    pixels = list(im.getdata())
    avg = sum(pixels) / len(pixels)
    bits = 0
    for i, px in enumerate(pixels):
        if px > avg:
            bits |= 1 << i
    return (bits,)


def hamming(a: tuple[int, ...], b: tuple[int, ...]) -> int:
    return bin(a[0] ^ b[0]).count("1")


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"sources": {}, "outputs": {}}


def save_manifest(data: dict) -> None:
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def existing_hashes(slug: str) -> list[tuple[str, tuple[int, ...]]]:
    hashes: list[tuple[str, tuple[int, ...]]] = []
    for path in OUT.glob(f"case-{slug}-*.webp"):
        try:
            with Image.open(path) as im:
                hashes.append((path.name, avg_hash(im)))
        except OSError:
            continue
    return hashes


def next_case_num(slug: str) -> int:
    nums = []
    for path in OUT.glob(f"case-{slug}-*.webp"):
        m = re.search(r"-(\d+)\.webp$", path.name)
        if m:
            nums.append(int(m.group(1)))
    return max(nums, default=0) + 1


def gallery_item(slug: str, num: int, label: str) -> str:
    title, short = SLUG_META.get(slug, (slug, slug))
    return f"""          <div class="project-gallery__item">
            <div class="media-reveal" data-reveal>
              <div class="media-reveal__mask">
                <div class="media-reveal__zoom">
                  <img class="media-reveal__img" src="/images/projects/case-{slug}-{num}.webp" alt="{title} — {label}" width="1600" height="1200" loading="lazy" />
                </div>
              </div>
            </div>
          </div>"""


def append_gallery(html_path: Path, slug: str, num: int, label: str) -> bool:
    text = html_path.read_text()
    src = f"/images/projects/case-{slug}-{num}.webp"
    if src in text:
        return False
    block = gallery_item(slug, num, label)
    marker = "</div>\n        </div>\n      </section>"
    idx = text.find('class="project-gallery__grid"')
    if idx == -1:
        return False
    end = text.find(marker, idx)
    if end == -1:
        return False
    text = text[:end] + block + "\n" + text[end:]
    html_path.write_text(text)
    return True


def main() -> None:
    manifest = load_manifest()
    sources: dict[str, list[Path]] = {}
    skipped: list[str] = []

    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        if any(part in rel for part in SKIP_DIRS):
            continue
        slug = map_slug(path)
        if slug:
            sources.setdefault(slug, []).append(path)
        else:
            skipped.append(rel)

    exported: list[tuple[str, int, str, str]] = []
    hash_cache: dict[str, list[tuple[str, tuple[int, ...]]]] = {}

    for slug, paths in sorted(sources.items()):
        hash_cache[slug] = existing_hashes(slug)
        for path in paths:
            rel = str(path.relative_to(ROOT)).replace("\\", "/")
            if rel in manifest["sources"]:
                continue

            try:
                with Image.open(path) as src_im:
                    src_hash = avg_hash(src_im)
            except OSError as exc:
                print(f"skip unreadable {rel}: {exc}")
                continue

            duplicate = None
            for name, existing in hash_cache[slug]:
                if hamming(src_hash, existing) <= 6:
                    duplicate = name
                    break

            if duplicate:
                manifest["sources"][rel] = duplicate
                continue

            num = next_case_num(slug)
            out_name = f"case-{slug}-{num}.webp"
            out_path = OUT / out_name

            with Image.open(path) as src_im:
                cover(src_im, *CARD).save(out_path, "WEBP", quality=84, method=6)

            hash_cache[slug].append((out_name, src_hash))
            manifest["sources"][rel] = out_name
            manifest["outputs"][out_name] = rel
            exported.append((slug, num, rel, path.stem.replace("_", " ")))
            print(f"✓ {out_name:42} ← {rel}")

    save_manifest(manifest)

    html_updates = 0
    for slug, num, _rel, label in exported:
        html_path = PROJECTS_DIR / f"{slug}.html"
        if html_path.exists() and append_gallery(html_path, slug, num, label):
            html_updates += 1

    print(f"\nExported: {len(exported)} new images")
    print(f"Gallery HTML updates: {html_updates}")
    print(f"Unmapped/skipped sources ({len(skipped)}):")
    for rel in skipped:
        print(f"  - {rel}")


if __name__ == "__main__":
    main()
