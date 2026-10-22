#!/usr/bin/env python3
"""生成自托管商品占位图（统一风格的 SVG 插画，含商品名）。

背景：审计指出线上商品图使用第三方 picsum.photos 随机风景图，
与商品名不符且国内访问不稳定。这里用脚本为 50 件种子商品生成
统一视觉语言的本地 SVG：暖纸底 + 分类线稿 icon + 商品名，
由前端 `public/img/products/` 托管，页面不再依赖任何第三方图片域名。

用法：python scripts/gen_product_images.py
输入：seed_server_products.sql（仓库根目录）
输出：public/img/products/p{id}.svg
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL = ROOT / "seed_server_products.sql"
OUT = ROOT / "public" / "img" / "products"

# 分类色板（与前端 --accent 设计系统一致：暖纸底 + 墨色 + 克制的彩色点缀）
CATEGORY = {
    1: {"name": "数码", "bg1": "#eef2ef", "bg2": "#e4ece7", "accent": "#1f7a54", "icon": "headphones"},
    2: {"name": "食品", "bg1": "#f8f1e6", "bg2": "#f1e6d4", "accent": "#a05a12", "icon": "coffee"},
    3: {"name": "美妆", "bg1": "#f7eeec", "bg2": "#f1e1de", "accent": "#b0473f", "icon": "lipstick"},
    4: {"name": "服饰", "bg1": "#eef0f4", "bg2": "#e2e7ee", "accent": "#3c5a78", "icon": "tshirt"},
    5: {"name": "家电", "bg1": "#f3f1e7", "bg2": "#eae6d6", "accent": "#7a6a1f", "icon": "lamp"},
    6: {"name": "家居", "bg1": "#f1efeb", "bg2": "#e8e4dc", "accent": "#6f6e66", "icon": "sofa"},
}

ICONS = {
    "headphones": (
        '<path d="M4 14.5v-2.3a8 8 0 0 1 16 0v2.3" />'
        '<rect x="3.2" y="13.2" width="4.2" height="7.2" rx="2.1" />'
        '<rect x="16.6" y="13.2" width="4.2" height="7.2" rx="2.1" />'
    ),
    "coffee": (
        '<path d="M4.8 8.4h11.4v5.9a5 5 0 0 1-5 5H9.8a5 5 0 0 1-5-5V8.4Z" />'
        '<path d="M16.2 9.6h1.6a2.6 2.6 0 0 1 0 5.2h-1.6" />'
        '<path d="M8.2 4.4c0-.9.9-1.4.9-2.2M11.8 4.4c0-.9.9-1.4.9-2.2" />'
    ),
    "lipstick": (
        '<rect x="9" y="10.2" width="6" height="10.8" rx="1.4" />'
        '<path d="M9.4 10.2V6.6L12 3.4l2.6 3.2v3.6" />'
        '<path d="M9.6 13.4h4.8" />'
    ),
    "tshirt": (
        '<path d="M8.4 4.2 4.4 7l2 3.1 2-1V20h7.2V9.1l2 1 2-3.1-4-2.8a4 4 0 0 1-7.2 0Z" />'
    ),
    "lamp": (
        '<path d="M8.4 3h7.2l3.1 8.4H5.3L8.4 3Z" />'
        '<path d="M12 11.4V18" />'
        '<path d="M8.2 21h7.6" />'
    ),
    "sofa": (
        '<path d="M5.4 11.2V8.8a2.2 2.2 0 0 1 2.2-2.2h8.8a2.2 2.2 0 0 1 2.2 2.2v2.4" />'
        '<path d="M3.4 11.4a2.2 2.2 0 0 1 2.2 2.2v3.2h12.8v-3.2a2.2 2.2 0 0 1 4.4 0v5.6H2V13.6a2.2 2.2 0 0 1 1.4-2.2Z" />'
    ),
}

INSERT_RE = re.compile(
    r"INSERT INTO products \(id, created_at, updated_at, name, price_cents, description, "
    r"stock, category_id, status, sale_count\) VALUES \((\d+), NOW\(3\), NOW\(3\), '([^']+)', "
    r"(\d+), '([^']*)', (\d+), (\d+), '([^']+)', (\d+)\);"
)


def parse_products(sql_text: str) -> list[dict]:
    product_ids = re.findall(r"INSERT INTO products \(id,", sql_text)
    rows = []
    for m in INSERT_RE.finditer(sql_text):
        pid, name, price, desc, stock, cat, status, sale = m.groups()
        rows.append(
            {
                "id": int(pid),
                "name": name,
                "price_cents": int(price),
                "description": desc,
                "stock": int(stock),
                "category_id": int(cat),
                "status": status,
                "sale_count": int(sale),
            }
        )
    if len(rows) != len(product_ids):  # 解析不完整时直接报错，避免静默生成错图
        raise SystemExit(f"解析商品失败：找到 {len(product_ids)} 条 INSERT，只解析出 {len(rows)} 条")
    return rows


def wrap_name(name: str, limit: int) -> list[str]:
    """按字符数折行；优先在空格处断开。"""
    if len(name) <= limit:
        return [name]
    # 中文商品名基本无空格，直接按长度切；遇到空格则优先用空格
    if " " in name and len(name.split(" ")[0]) <= limit:
        parts = name.split(" ")
        lines, cur = [], parts[0]
        for token in parts[1:]:
            if len(cur) + 1 + len(token) <= limit:
                cur += " " + token
            else:
                lines.append(cur)
                cur = token
        lines.append(cur)
        return lines
    return [name[i : i + limit] for i in range(0, len(name), limit)]


def build_svg(product: dict) -> str:
    cat = CATEGORY.get(product["category_id"], CATEGORY[6])
    icon = ICONS[cat["icon"]]
    uid = product["id"]
    lines = wrap_name(html.escape(product["name"]), 9)
    line_height = 40 if len(lines) <= 2 else 34
    font_size = 32 if len(product["name"]) <= 9 else 28
    total_h = line_height * len(lines)
    name_center_y = 452
    first_y = name_center_y - total_h // 2 + line_height - 10
    price_y = name_center_y + total_h // 2 + 38
    name_svg = ""
    for i, line in enumerate(lines):
        name_svg += (
            f'<text x="300" y="{first_y + i * line_height}" text-anchor="middle" '
            f'font-size="{font_size}" font-weight="700" fill="#1a1a17" '
            f'letter-spacing="0.02em">{line}</text>'
        )
    price_yuan = product["price_cents"] / 100
    price_text = f"¥{price_yuan:,.2f}" if price_yuan >= 1 else f"¥{price_yuan:.2f}"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-label="{html.escape(product['name'])}">
  <defs>
    <radialGradient id="g{uid}a" cx="22%" cy="14%" r="85%">
      <stop offset="0%" stop-color="{cat['bg1']}"/>
      <stop offset="100%" stop-color="{cat['bg2']}"/>
    </radialGradient>
    <radialGradient id="g{uid}b" cx="82%" cy="92%" r="70%">
      <stop offset="0%" stop-color="{cat['accent']}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="{cat['accent']}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots{uid}" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.6" cy="1.6" r="1.1" fill="#1a1a17" opacity="0.07"/>
    </pattern>
  </defs>
  <rect width="600" height="600" fill="url(#g{uid}a)"/>
  <rect width="600" height="600" fill="url(#dots{uid})"/>
  <rect width="600" height="600" fill="url(#g{uid}b)"/>
  <circle cx="300" cy="250" r="132" fill="#ffffff" opacity="0.55"/>
  <circle cx="300" cy="250" r="132" fill="none" stroke="{cat['accent']}" stroke-opacity="0.28" stroke-width="1.4"/>
  <ellipse cx="300" cy="392" rx="86" ry="12" fill="#1a1a17" opacity="0.07"/>
  <svg x="204" y="154" width="192" height="192" viewBox="0 0 24 24" fill="none"
       stroke="{cat['accent']}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
    {icon}
  </svg>
  <text x="48" y="54" font-size="15" font-weight="700" letter-spacing="0.24em" fill="{cat['accent']}" opacity="0.9">MALL · {cat['name']}</text>
  <text x="552" y="54" text-anchor="end" font-size="13" font-weight="600" letter-spacing="0.14em" fill="#8a887e">DEMO VISUAL</text>
  {name_svg}
  <text x="300" y="{price_y}" text-anchor="middle" font-size="19" font-weight="700" fill="{cat['accent']}" opacity="0.92">{price_text}</text>
  <text x="48" y="566" font-size="12" font-weight="600" letter-spacing="0.18em" fill="#9c9a90">NO. {uid}</text>
  <text x="552" y="566" text-anchor="end" font-size="12" font-weight="600" letter-spacing="0.18em" fill="#9c9a90">mall.syloe1.xyz</text>
</svg>
"""


def main() -> None:
    if not SQL.exists():
        raise SystemExit(f"找不到种子 SQL：{SQL}")
    products = parse_products(SQL.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for product in products:
        (OUT / f"p{product['id']}.svg").write_text(build_svg(product), encoding="utf-8")
    print(f"生成 {len(products)} 张商品 SVG -> {OUT}")


if __name__ == "__main__":
    main()
