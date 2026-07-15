from __future__ import annotations

from math import cos, pi, sin
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "brand"

BLUE = "#0B5ED7"
BLUE_DARK = "#06295B"
BLUE_SOFT = "#EAF2FF"
INK = "#0F172A"
RED = "#E70013"
WHITE = "#FFFFFF"
SLATE = "#5B6B86"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/bahnschrift.ttf"),
    ]

    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except OSError:
                continue

    return ImageFont.load_default()


def star_points(cx: float, cy: float, outer: float, inner: float, points: int = 5) -> list[tuple[float, float]]:
    coords: list[tuple[float, float]] = []
    start_angle = -pi / 2
    step = pi / points
    for index in range(points * 2):
      angle = start_angle + (index * step)
      radius = outer if index % 2 == 0 else inner
      coords.append((cx + cos(angle) * radius, cy + sin(angle) * radius))
    return coords


def draw_mark(size: int, monochrome: str | None = None, transparent: bool = True) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)

    pad = int(size * 0.07)
    radius = int(size * 0.22)
    box = (pad, pad, size - pad, size - pad)

    if monochrome == "white":
        draw.rounded_rectangle(box, radius=radius, fill=(255, 255, 255, 255))
        page_fill = (255, 255, 255, 255)
        page_inner = (255, 255, 255, 255)
        accent_fill = (255, 255, 255, 255)
    else:
        base_tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        tile_draw = ImageDraw.Draw(base_tile)
        tile_draw.rounded_rectangle(box, radius=radius, fill=BLUE)

        highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        highlight_draw = ImageDraw.Draw(highlight)
        highlight_draw.ellipse(
            (int(size * 0.1), int(size * 0.04), int(size * 0.88), int(size * 0.64)),
            fill=(255, 255, 255, 36),
        )
        highlight = highlight.filter(ImageFilter.GaussianBlur(radius=max(int(size * 0.05), 1)))
        tile = Image.alpha_composite(base_tile, highlight)
        image = Image.alpha_composite(image, tile)
        draw = ImageDraw.Draw(image)
        page_fill = (255, 255, 255, 255)
        page_inner = (233, 242, 255, 255)
        accent_fill = ImageColorTuple.from_hex(RED)

    center_x = size / 2
    top_y = size * 0.24
    book_top = size * 0.43
    book_bottom = size * 0.73
    gutter_top = size * 0.44

    left_page = [
        (size * 0.25, book_top),
        (size * 0.43, size * 0.34),
        (size * 0.47, gutter_top),
        (size * 0.47, book_bottom),
        (size * 0.31, size * 0.79),
        (size * 0.25, size * 0.77),
    ]
    right_page = [
        (size * 0.75, book_top),
        (size * 0.57, size * 0.34),
        (size * 0.53, gutter_top),
        (size * 0.53, book_bottom),
        (size * 0.69, size * 0.79),
        (size * 0.75, size * 0.77),
    ]

    draw.polygon(left_page, fill=page_fill)
    draw.polygon(right_page, fill=page_fill)
    draw.polygon(
        [
            (size * 0.30, size * 0.74),
            (size * 0.43, size * 0.67),
            (size * 0.43, size * 0.74),
            (size * 0.33, size * 0.78),
        ],
        fill=page_inner,
    )
    draw.polygon(
        [
            (size * 0.70, size * 0.74),
            (size * 0.57, size * 0.67),
            (size * 0.57, size * 0.74),
            (size * 0.67, size * 0.78),
        ],
        fill=page_inner,
    )
    draw.rounded_rectangle(
        (size * 0.485, size * 0.36, size * 0.515, size * 0.73),
        radius=int(size * 0.015),
        fill=(222, 236, 255, 235) if monochrome != "white" else (255, 255, 255, 255),
    )

    draw.polygon(star_points(center_x, top_y, size * 0.07, size * 0.03), fill=accent_fill)

    if monochrome != "white":
        shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 24), width=max(size // 64, 2))
        image = Image.alpha_composite(image, shadow)

    return image


class ImageColorTuple:
    @staticmethod
    def from_hex(value: str) -> tuple[int, int, int, int]:
        value = value.lstrip("#")
        return tuple(int(value[index:index + 2], 16) for index in range(0, 6, 2)) + (255,)


def save_png(image: Image.Image, path: Path, size: tuple[int, int] | None = None) -> None:
    if size:
        image = image.resize(size, Image.LANCZOS)
    image.save(path, optimize=True)


def fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    start_size: int,
    bold: bool = True,
) -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, tuple[int, int, int, int]]:
    size = start_size
    while size > 18:
        font = load_font(size, bold=bold)
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            return font, bbox
        size -= 4
    font = load_font(size, bold=bold)
    return font, draw.textbbox((0, 0), text, font=font)


def build_horizontal_logo(
    width: int,
    height: int,
    text_color: str = INK,
    subtitle_color: str = SLATE,
    icon_mode: str | None = None,
) -> Image.Image:
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    icon_size = int(height * 0.78)
    icon = draw_mark(icon_size, monochrome=icon_mode)
    icon_y = (height - icon_size) // 2
    image.alpha_composite(icon, (0, icon_y))

    draw = ImageDraw.Draw(image)
    word_x = icon_size + int(height * 0.14)
    brand_y = int(height * 0.16)
    text_area = width - word_x - 24
    brand_font, _ = fit_text(draw, "TuniBac", text_area, int(height * 0.30))
    brand_bbox = draw.textbbox((0, 0), "TuniBac", font=brand_font)
    sub_font, _ = fit_text(draw, "Premium Bac Learning Platform", text_area, int(height * 0.10), bold=False)

    text_color_fill = ImageColorTuple.from_hex(text_color) if text_color.startswith("#") else (15, 23, 42, 255)
    subtitle_fill = ImageColorTuple.from_hex(subtitle_color) if subtitle_color.startswith("#") else (91, 107, 134, 255)

    tuni_bbox = draw.textbbox((0, 0), "Tuni", font=brand_font)
    draw.text((word_x, brand_y), "Tuni", font=brand_font, fill=text_color_fill)
    draw.text((word_x + (tuni_bbox[2] - tuni_bbox[0]), brand_y), "Bac", font=brand_font, fill=ImageColorTuple.from_hex(BLUE if icon_mode != "white" else WHITE))

    tagline_y = brand_y + (brand_bbox[3] - brand_bbox[1]) + int(height * 0.10)
    draw.text((word_x, tagline_y), "Premium Bac Learning Platform", font=sub_font, fill=subtitle_fill)

    accent_y = tagline_y + int(height * 0.16)
    draw.rounded_rectangle(
        (word_x, accent_y, word_x + int(height * 0.24), accent_y + 8),
        radius=4,
        fill=ImageColorTuple.from_hex(RED if icon_mode != "white" else WHITE),
    )
    return image


def build_stacked_logo(width: int, height: int) -> Image.Image:
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    icon_size = int(min(width, height) * 0.34)
    icon = draw_mark(icon_size)
    icon_x = (width - icon_size) // 2
    icon_y = int(height * 0.08)
    image.alpha_composite(icon, (icon_x, icon_y))

    draw = ImageDraw.Draw(image)
    brand_font = load_font(int(height * 0.12), bold=True)
    subtitle_font = load_font(int(height * 0.04))
    draw.text((width * 0.21, height * 0.5), "Tuni", font=brand_font, fill=ImageColorTuple.from_hex(INK))
    tuni_width = draw.textbbox((0, 0), "Tuni", font=brand_font)[2]
    draw.text((width * 0.21 + tuni_width, height * 0.5), "Bac", font=brand_font, fill=ImageColorTuple.from_hex(BLUE))
    draw.text(
        (width * 0.17, height * 0.66),
        "Premium Bac Learning Platform",
        font=subtitle_font,
        fill=ImageColorTuple.from_hex(SLATE),
    )
    draw.text(
        (width * 0.17, height * 0.76),
        "Modern learning tools for Tunisian students",
        font=subtitle_font,
        fill=ImageColorTuple.from_hex(BLUE_DARK),
    )
    return image


def svg_mark(tile_fill: str = "url(#tileGradient)", page_fill: str = WHITE, accent_fill: str = RED, outline_fill: str | None = None) -> str:
    outline = ""
    if outline_fill:
        outline = f'<rect x="36" y="36" width="440" height="440" rx="112" fill="none" stroke="{outline_fill}" stroke-opacity="0.22" stroke-width="6" />'

    return f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="tileGradient" x1="76" y1="44" x2="456" y2="468" gradientUnits="userSpaceOnUse">
      <stop stop-color="{BLUE_DARK}" />
      <stop offset="1" stop-color="{BLUE}" />
    </linearGradient>
  </defs>
  <rect x="36" y="36" width="440" height="440" rx="112" fill="{tile_fill}" />
  <ellipse cx="200" cy="130" rx="160" ry="120" fill="{WHITE}" fill-opacity="0.10" />
  <path d="M128 220L220 154L240 198V374L158 404L128 394V220Z" fill="{page_fill}" />
  <path d="M384 220L292 154L272 198V374L354 404L384 394V220Z" fill="{page_fill}" />
  <path d="M154 374L220 338V374L170 392L154 387V374Z" fill="{BLUE_SOFT if page_fill != WHITE else WHITE}" />
  <path d="M358 374L292 338V374L342 392L358 387V374Z" fill="{BLUE_SOFT if page_fill != WHITE else WHITE}" />
  <rect x="248" y="178" width="16" height="198" rx="8" fill="{BLUE_SOFT if page_fill != WHITE else WHITE}" />
  <path d="M256 88L271 119H305L278 138L288 168L256 149L224 168L234 138L207 119H241L256 88Z" fill="{accent_fill}" />
  {outline}
</svg>
""".strip()


def svg_horizontal(text_fill: str = INK, subtitle_fill: str = SLATE, icon_file: str = "tunibac-logo-icon.svg", bac_fill: str = BLUE) -> str:
    return f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 320" fill="none">
  <image href="/brand/{icon_file}" x="0" y="36" width="248" height="248" />
  <text x="292" y="150" fill="{text_fill}" font-size="118" font-weight="800" font-family="Segoe UI, Inter, Arial, sans-serif">Tuni<tspan fill="{bac_fill}">Bac</tspan></text>
  <text x="292" y="216" fill="{subtitle_fill}" font-size="40" font-weight="500" letter-spacing="1.2" font-family="Segoe UI, Inter, Arial, sans-serif">Premium Bac Learning Platform</text>
  <rect x="292" y="252" width="128" height="10" rx="5" fill="{RED if bac_fill != WHITE else WHITE}" />
</svg>
""".strip()


def svg_stacked() -> str:
    return f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 760" fill="none">
  <image href="/brand/tunibac-logo-icon.svg" x="290" y="20" width="340" height="340" />
  <text x="182" y="510" fill="{INK}" font-size="154" font-weight="800" font-family="Segoe UI, Inter, Arial, sans-serif">Tuni<tspan fill="{BLUE}">Bac</tspan></text>
  <text x="208" y="586" fill="{SLATE}" font-size="48" font-weight="500" letter-spacing="1.1" font-family="Segoe UI, Inter, Arial, sans-serif">Premium Bac Learning Platform</text>
  <text x="164" y="650" fill="{BLUE_DARK}" font-size="36" font-weight="600" letter-spacing="2" font-family="Segoe UI, Inter, Arial, sans-serif">MODERN TOOLS FOR TUNISIAN STUDENTS</text>
</svg>
""".strip()


def build_social_card(width: int, height: int, subtitle: str, output_path: Path) -> None:
    image = Image.new("RGBA", (width, height), ImageColorTuple.from_hex(BLUE_SOFT))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((0, 0, width, height), radius=0, fill=ImageColorTuple.from_hex(BLUE_SOFT))
    draw.ellipse((-120, -140, 520, 420), fill=(11, 94, 215, 34))
    draw.ellipse((width - 500, height - 360, width + 140, height + 120), fill=(231, 0, 19, 28))

    panel = (48, 48, width - 48, height - 48)
    draw.rounded_rectangle(panel, radius=44, fill=ImageColorTuple.from_hex(WHITE), outline=(11, 94, 215, 24), width=2)

    logo = build_horizontal_logo(760, 220)
    image.alpha_composite(logo, (84, 96))

    headline_font = load_font(52, bold=True)
    body_font = load_font(28)
    pill_font = load_font(24, bold=True)

    draw.text((84, 304), "Premium Bac learning, built for Tunisia", font=headline_font, fill=ImageColorTuple.from_hex(INK))
    draw.text((84, 384), subtitle, font=body_font, fill=ImageColorTuple.from_hex(SLATE))

    pills = ["Courses", "Exercises", "Planner", "Homework"]
    current_x = 84
    pill_y = 458
    for label in pills:
        bbox = draw.textbbox((0, 0), label, font=pill_font)
        pill_width = (bbox[2] - bbox[0]) + 42
        draw.rounded_rectangle((current_x, pill_y, current_x + pill_width, pill_y + 54), radius=27, fill=(11, 94, 215, 18))
        draw.text((current_x + 21, pill_y + 12), label, font=pill_font, fill=ImageColorTuple.from_hex(BLUE_DARK))
        current_x += pill_width + 16

    mark = draw_mark(176)
    image.alpha_composite(mark, (width - 246, 360))
    draw.rounded_rectangle((width - 336, 84, width - 108, 136), radius=26, fill=ImageColorTuple.from_hex(RED))
    draw.text((width - 304, 98), "OFFICIAL BRAND", font=pill_font, fill=ImageColorTuple.from_hex(WHITE))

    image.save(output_path, optimize=True)


def main() -> None:
    ensure_dir(OUT_DIR)

    (OUT_DIR / "tunibac-logo-icon.svg").write_text(svg_mark(), encoding="utf-8")
    (OUT_DIR / "tunibac-logo-white.svg").write_text(
        svg_horizontal(text_fill=WHITE, subtitle_fill=WHITE, icon_file="tunibac-logo-icon-white.svg", bac_fill=WHITE),
        encoding="utf-8",
    )
    (OUT_DIR / "tunibac-logo-dark.svg").write_text(
        svg_horizontal(text_fill=WHITE, subtitle_fill=WHITE, icon_file="tunibac-logo-icon.svg", bac_fill=BLUE),
        encoding="utf-8",
    )
    (OUT_DIR / "tunibac-logo-horizontal.svg").write_text(svg_horizontal(), encoding="utf-8")
    (OUT_DIR / "tunibac-logo.svg").write_text(svg_stacked(), encoding="utf-8")
    (OUT_DIR / "tunibac-logo-icon-white.svg").write_text(
        svg_mark(tile_fill=WHITE, page_fill=WHITE, accent_fill=WHITE, outline_fill=WHITE),
        encoding="utf-8",
    )

    transparent_logo = build_horizontal_logo(1800, 480)
    save_png(transparent_logo, OUT_DIR / "tunibac-logo-transparent.png")

    icon_512 = draw_mark(512)
    icon_192 = draw_mark(192)
    save_png(icon_512, OUT_DIR / "tunibac-icon-512.png")
    save_png(icon_192, OUT_DIR / "tunibac-icon-192.png")

    apple_icon = Image.new("RGBA", (180, 180), ImageColorTuple.from_hex(WHITE))
    apple_mark = draw_mark(132)
    apple_icon.alpha_composite(apple_mark, ((180 - 132) // 2, (180 - 132) // 2))
    save_png(apple_icon, OUT_DIR / "apple-touch-icon.png")

    favicon_32 = draw_mark(32)
    favicon_16 = draw_mark(16)
    save_png(favicon_32, OUT_DIR / "favicon-32.png")
    save_png(favicon_16, OUT_DIR / "favicon-16.png")
    icon_512.save(OUT_DIR / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    build_social_card(
        1200,
        630,
        "Official TuniBac branding across courses, exercises, planner, homework, and communication tools.",
        OUT_DIR / "tunibac-og-image.png",
    )
    build_social_card(
        1280,
        720,
        "A clean, premium identity designed for Tunisian Bac students and administrators.",
        OUT_DIR / "tunibac-social-preview.png",
    )


if __name__ == "__main__":
    main()
