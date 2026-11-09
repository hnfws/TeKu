import base64
from io import BytesIO
import os
import re
import time
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import requests
from dotenv import load_dotenv
from PIL import Image, ImageOps, UnidentifiedImageError
from playwright.sync_api import sync_playwright

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

LARAVEL_API_URL = os.getenv("LARAVEL_API_URL", "http://localhost:8000/api/scraped-events")
API_TOKEN = os.getenv("SCRAPER_API_TOKEN")
API_TIMEOUT_SECONDS = 120
REFRESH_EXISTING = os.getenv("SCRAPER_REFRESH_EXISTING", "").casefold() == "true"


def api_endpoint(suffix=""):
    """Accept an app URL, /api URL, or the scraped-events API endpoint."""
    parsed = urlsplit(LARAVEL_API_URL.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.query or parsed.fragment:
        raise RuntimeError(
            "LARAVEL_API_URL harus berupa URL aplikasi atau endpoint /api/scraped-events yang valid."
        )

    path = parsed.path.rstrip("/")
    endpoint = "/api/scraped-events"
    if path.endswith(endpoint):
        base_path = path
    elif path.endswith("/api"):
        base_path = f"{path}/scraped-events"
    else:
        base_path = f"{path}{endpoint}"

    return urlunsplit((parsed.scheme, parsed.netloc, f"{base_path}{suffix}", "", ""))


TARGET_ACCOUNTS = [
    "infobazaar",
    "pestapora",
    "synchronizefest",
    "jktgo",
    "eventjakarta",
    "kulinerdepok",
    "infotenantyk",
    "info.tenant",
]

TRIGGER_KEYWORDS = [
    "tenant",
    "sewa",
    "disewakan",
    "event space",
    "venue",
    "rental",
    "booking",
    "open house",
]

TIMELINE_MONTHS = 3
PROFILE_SCROLL_PAUSE_MS = 1500
MAX_STALLED_SCROLLS = 3
MONTH_NAMES = {
    "jan": 1, "januari": 1, "january": 1,
    "feb": 2, "februari": 2, "february": 2,
    "mar": 3, "maret": 3, "march": 3,
    "apr": 4, "april": 4,
    "mei": 5, "may": 5,
    "jun": 6, "juni": 6, "june": 6,
    "jul": 7, "juli": 7, "july": 7,
    "agu": 8, "agustus": 8, "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "okt": 10, "oktober": 10, "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "des": 12, "desember": 12, "dec": 12, "december": 12,
}
MONTH_PATTERN = "|".join(sorted(MONTH_NAMES, key=len, reverse=True))
DATE_RANGE_PATTERN = re.compile(
    rf"(?<!\d)(?P<start_day>\d{{1,2}})\s*(?:-|–|—|s\.?d\.?|sampai|hingga|to)\s*"
    rf"(?P<end_day>\d{{1,2}})\s+(?P<month>{MONTH_PATTERN})\.?"
    rf"(?:\s+(?P<year>20\d{{2}}))?",
    re.IGNORECASE,
)
DATE_PATTERN = re.compile(
    rf"(?<!\d)(?P<day>\d{{1,2}})\s+(?P<month>{MONTH_PATTERN})\.?"
    rf"(?:\s+(?P<year>20\d{{2}}))?",
    re.IGNORECASE,
)
NUMERIC_DATE_PATTERN = re.compile(
    r"(?<!\d)(?P<day>\d{1,2})[/-](?P<month>\d{1,2})[/-](?P<year>20\d{2})(?!\d)"
)
DATE_CONTEXT_PATTERN = re.compile(
    r"\b(event|acara|bazaar|bazar|festival|expo|pameran|berlangsung|tanggal|date|held)\b",
    re.IGNORECASE,
)
NON_EVENT_DATE_PATTERN = re.compile(
    r"\b(deadline|closing|close|tutup|registrasi|pendaftaran|daftar|registration)\b",
    re.IGNORECASE,
)
PRICE_PATTERN = re.compile(
    r"(?<![\w])(?P<currency>rp\.?\s*)?(?P<amount>\d[\d.,]*"
    r"(?:\s*(?:juta|jt|ribu|rb|million|k))?)(?![\w])",
    re.IGNORECASE,
)
TENANT_PRICE_LABEL_PATTERN = re.compile(
    r"\b(?:harga|biaya|tarif|sewa|investasi|price)\s*"
    r"(?:(?:tenant|booth|stand|lapak)\s*)?"
    r"(?:(?:mulai\s+dari|from)\s*)?[:=\-]?\s*"
    r"(?:rp\.?\s*)?(?P<amount>\d[\d.,]*(?:\s*(?:juta|jt|ribu|rb|million|k))?)",
    re.IGNORECASE,
)


class NoPublicPostsError(RuntimeError):
    """Instagram tidak menampilkan permalink yang dapat diakses untuk profil."""


def subtract_months(value, months):
    """Kurangi bulan kalender dan sesuaikan tanggal jika bulan tujuan lebih pendek."""
    month_index = value.month - 1 - months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def contains_keywords(text):
    """Mengecek apakah caption mengandung salah satu kata kunci pemicu."""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in TRIGGER_KEYWORDS)


def parse_price(caption):
    """Extract an explicitly labeled tenant/booth fee, not an unrelated price."""
    for match in TENANT_PRICE_LABEL_PATTERN.finditer(caption):
        amount = parse_money_amount(match.group("amount"))
        if amount is not None:
            return amount

    currency_amounts = [
        parse_money_amount(match.group("amount"))
        for match in PRICE_PATTERN.finditer(caption)
        if match.group("currency") or re.search(r"(?:juta|jt|ribu|rb|million|k)$", match.group("amount"), re.I)
    ]
    currency_amounts = [amount for amount in currency_amounts if amount is not None]
    if len(currency_amounts) == 1:
        return currency_amounts[0]

    return None


def parse_money_amount(value):
    """Convert Indonesian currency formats such as 1.500.000 or 1,5 juta."""
    normalized = value.strip().casefold()
    suffix_match = re.search(r"\s*(juta|jt|ribu|rb|million|k)$", normalized)
    multiplier = 1
    if suffix_match:
        suffix = suffix_match.group(1)
        multiplier = 1_000_000 if suffix in {"juta", "jt", "million"} else 1_000
        normalized = normalized[:suffix_match.start()].strip()

    if "." in normalized and "," in normalized:
        decimal_separator = "." if normalized.rfind(".") > normalized.rfind(",") else ","
        grouping_separator = "," if decimal_separator == "." else "."
        normalized = normalized.replace(grouping_separator, "")
        normalized = normalized.replace(decimal_separator, ".")
    elif suffix_match and ("," in normalized or "." in normalized):
        normalized = normalized.replace(",", ".")
    else:
        normalized = re.sub(r"[.,](?=\d{3}(?:\D|$))", "", normalized)
        normalized = normalized.replace(",", ".")

    try:
        amount = int(round(float(normalized) * multiplier))
    except ValueError:
        return None

    return amount if amount > 0 else None


def date_context(caption, start, end):
    """Keep date hints local so a nearby registration deadline is not mistaken for event dates."""
    boundaries = r"[\n.!?;|•]"
    prior_boundaries = list(re.finditer(boundaries, caption[:start]))
    next_boundary = re.search(boundaries, caption[end:])
    context_start = prior_boundaries[-1].end() if prior_boundaries else 0
    context_end = end + next_boundary.start() if next_boundary else len(caption)
    return caption[context_start:context_end]


def parse_event_dates(caption, posted_at=None):
    """Return explicit event dates from a caption; infer a missing year from its post date."""
    anchor = posted_at or datetime.now(timezone.utc)
    if isinstance(anchor, str):
        anchor = datetime.fromisoformat(anchor.replace("Z", "+00:00"))
    anchor_date = anchor.date()

    candidates = []
    occupied_ranges = []
    for match in DATE_RANGE_PATTERN.finditer(caption):
        context = date_context(caption, match.start(), match.end())
        if NON_EVENT_DATE_PATTERN.search(context) and not DATE_CONTEXT_PATTERN.search(context):
            continue
        candidates.append(match)
        occupied_ranges.append(match.span())

    for pattern in (NUMERIC_DATE_PATTERN, DATE_PATTERN):
        for match in pattern.finditer(caption):
            if any(start <= match.start() < end for start, end in occupied_ranges):
                continue
            context = date_context(caption, match.start(), match.end())
            if not DATE_CONTEXT_PATTERN.search(context):
                continue
            if NON_EVENT_DATE_PATTERN.search(context) and not re.search(
                r"\b(event|acara|bazaar|bazar|festival|expo|pameran)\b", context, re.IGNORECASE
            ):
                continue
            candidates.append(match)

    if not candidates:
        return None, None

    match = min(candidates, key=lambda candidate: candidate.start())
    explicit_year = match.groupdict().get("year")
    if isinstance(match, re.Match) and "start_day" in match.groupdict():
        start_day = int(match.group("start_day"))
        end_day = int(match.group("end_day"))
        month = MONTH_NAMES[match.group("month").casefold().rstrip(".")]
        year = int(explicit_year) if explicit_year else anchor.year
        start_date = date(year, month, start_day)
        if not explicit_year and start_date < anchor_date:
            start_date = date(year + 1, month, start_day)
        end_year = start_date.year
        if end_day < start_day and month == 1:
            end_year += 1
        end_date = date(end_year, month, end_day)
        if end_date < start_date:
            end_date = date(start_date.year + 1, month, end_day)
    else:
        day = int(match.group("day"))
        month_value = match.group("month")
        if month_value.isdigit():
            month = int(month_value)
        else:
            month = MONTH_NAMES[month_value.casefold().rstrip(".")]
        year = int(explicit_year) if explicit_year else anchor.year
        start_date = date(year, month, day)
        if not explicit_year and start_date < anchor_date:
            start_date = date(year + 1, month, day)
        end_date = start_date

    return start_date.isoformat(), end_date.isoformat()


def parse_deadline(caption, now=None):
    """Parse clear relative closing phrases and return an ISO-8601 UTC deadline."""
    now = now or datetime.now(timezone.utc)
    patterns = (
        r"\bh\s*-\s*(\d+)\s*(?:hari\s*)?(?:lagi\s*)?(?:closing|close|deadline|tutup)\b",
        r"\b(?:closing|close|deadline|tutup)\s*(?:dalam\s*)?(\d+)\s*hari\b",
        r"\b(\d+)\s*hari\s*lagi\s*(?:closing|close|deadline|tutup)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, caption, re.IGNORECASE)
        if match:
            return (now + timedelta(days=int(match.group(1)))).isoformat()

    return None


def post_shortcode(post_url):
    segments = urlsplit(post_url).path.strip("/").split("/")
    return segments[-1] if len(segments) >= 2 else None


def api_headers():
    return {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }


def get_known_posts(account_name):
    response = requests.get(
        api_endpoint("/known-posts"),
        params={"account": account_name},
        headers=api_headers(),
        timeout=API_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return set(response.json()["shortcodes"])


def mark_posts_seen(account_name, posts):
    if not posts:
        return

    for index in range(0, len(posts), 500):
        response = requests.post(
            api_endpoint("/seen-posts"),
            json={"account": account_name, "posts": posts[index:index + 500]},
            headers=api_headers(),
            timeout=API_TIMEOUT_SECONDS,
        )
        response.raise_for_status()


def get_post_urls(page, account_name):
    links = page.locator('a[href*="/p/"], a[href*="/reel/"]').evaluate_all(
        "(links) => links.map((link) => link.href)"
    )
    post_urls = []
    for link in links:
        parsed = urlsplit(link)
        segments = parsed.path.strip("/").split("/")
        if (
            parsed.hostname not in {"www.instagram.com", "instagram.com"}
            or len(segments) < 3
            or segments[0].casefold() != account_name.casefold()
            or segments[1] not in {"p", "reel", "tv"}
        ):
            continue

        post_urls.append(f"https://www.instagram.com/{segments[0]}/{segments[1]}/{segments[2]}/")

    return list(dict.fromkeys(post_urls))


def compress_post_image(image_url, post_url):
    response = requests.get(
        image_url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; TeKuInstagramScraper/1.0)",
            "Referer": post_url,
        },
        timeout=20,
    )
    response.raise_for_status()

    with Image.open(BytesIO(response.content)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    for dimensions in (1024, 800, 640, 480):
        resized = image.copy()
        resized.thumbnail((dimensions, dimensions))
        for quality in (75, 65, 55):
            output = BytesIO()
            resized.save(output, format="JPEG", quality=quality, optimize=True)
            image_bytes = output.getvalue()
            if len(image_bytes) <= 240_000:
                return base64.b64encode(image_bytes).decode("ascii")

    raise RuntimeError("Gambar postingan Instagram tidak dapat dikompres hingga batas ukuran.")


def get_post_details(page):
    if "/accounts/login" in page.url or "/challenge/" in page.url:
        raise RuntimeError("Instagram mengalihkan postingan ke halaman login atau challenge.")

    page_html = page.content()
    timestamp_match = re.search(r'"taken_at"\s*:\s*(\d+)', page_html)
    if not timestamp_match:
        raise RuntimeError(f"Tanggal postingan tidak ditemukan: {page.url}")

    posted_at = datetime.fromtimestamp(int(timestamp_match.group(1)), tz=timezone.utc)
    image_url = page.locator('meta[property="og:image"]').get_attribute("content")

    for selector in ('meta[property="og:description"]', 'meta[name="description"]'):
        description = page.locator(selector).get_attribute("content")
        if description:
            return posted_at, description.strip(), image_url

    articles = page.locator("article").all_text_contents()
    caption = " ".join(text.strip() for text in articles if text.strip())
    return posted_at, caption, image_url


def send_match(account_name, post_url, caption, posted_at, image_url=None):
    start_date, end_date = parse_event_dates(caption, posted_at)
    image_base64 = None
    if image_url:
        try:
            image_base64 = compress_post_image(image_url, post_url)
        except (requests.RequestException, OSError, UnidentifiedImageError, RuntimeError) as error:
            print(f"  [!] Gambar postingan tidak dapat diambil/dikompres: {error}")
    else:
        print("  [!] Postingan tidak menyediakan URL gambar og:image.")

    payload = {
        "title": f"Event Tenant Call - @{account_name}",
        "description": caption,
        "location_name": "Jakarta / Depok (Perlu Validasi)",
        "latitude": -6.2,
        "longitude": 106.816666,
        "tenant_price": parse_price(caption),
        "image_base64": image_base64,
        "instagram_post_url": post_url,
        "registration_link": f"https://instagram.com/{account_name}",
        "account_name": account_name,
        "posted_at": posted_at.isoformat(),
        "deadline_date": parse_deadline(caption),
        "start_date": start_date,
        "end_date": end_date,
    }
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        api_endpoint(),
        json=payload,
        headers=headers,
        timeout=API_TIMEOUT_SECONDS,
    )
    if not response.ok:
        raise requests.HTTPError(
            f"Laravel API membalas {response.status_code}: {response.text}",
            response=response,
        )
    print(f"  [->] Laravel API: {response.status_code} - {response.text}")


def process_account(profile_page, post_page, account_name, cutoff, known_posts=None):
    profile_url = f"https://www.instagram.com/{account_name}/"
    print(f"\n[+] Checking Account: @{account_name}")
    known_posts = known_posts or set()

    profile_page.goto(profile_url, wait_until="domcontentloaded", timeout=15000)
    profile_page.wait_for_timeout(2000)

    if "/accounts/login" in profile_page.url or "/challenge/" in profile_page.url:
        raise RuntimeError("Instagram mengalihkan scraper ke halaman login atau challenge.")

    seen_urls = set()
    newly_seen_posts = []
    stalled_scrolls = 0
    saw_recent_post = False
    found_delta_boundary = False

    while stalled_scrolls < MAX_STALLED_SCROLLS:
        post_urls = get_post_urls(profile_page, account_name)
        new_urls = [url for url in post_urls if url not in seen_urls]
        seen_urls.update(new_urls)

        for post_url in new_urls:
            shortcode = post_shortcode(post_url)
            if shortcode in known_posts and not REFRESH_EXISTING:
                if saw_recent_post:
                    print(f"  [✓] Delta selesai: postingan lama @{account_name} ditemukan.")
                    found_delta_boundary = True
                    break

                print(f"  [-] Postingan tersimpan/pinned dilewati: {post_url}")
                continue

            post_page.goto(post_url, wait_until="domcontentloaded", timeout=8000)
            posted_at, caption, image_url = get_post_details(post_page)
            newly_seen_posts.append({
                "shortcode": shortcode,
                "posted_at": posted_at.isoformat(),
            })

            if posted_at < cutoff:
                if saw_recent_post:
                    print(
                        f"  [✓] Timeline @{account_name} selesai: "
                        f"{posted_at.date()} lebih lama dari {cutoff.date()}."
                    )
                    mark_posts_seen(account_name, newly_seen_posts)
                    return

                print(f"  [-] Postingan lama/pinned dilewati: {post_url} ({posted_at.date()})")
                continue

            saw_recent_post = True

            if contains_keywords(caption):
                print(f"  [🔥] MATCH FOUND! @{account_name}: {post_url}")
                send_match(account_name, post_url, caption, posted_at, image_url)
            else:
                print(f"  [-] Postingan tidak cocok: {post_url} ({posted_at.date()})")

        if found_delta_boundary:
            break

        if not post_urls and not seen_urls:
            raise NoPublicPostsError(
                "Instagram tidak menampilkan link postingan publik untuk akun ini."
            )

        profile_page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        profile_page.wait_for_timeout(PROFILE_SCROLL_PAUSE_MS)

        loaded_urls = get_post_urls(profile_page, account_name)
        if len(loaded_urls) <= len(seen_urls):
            stalled_scrolls += 1
        else:
            stalled_scrolls = 0

    mark_posts_seen(account_name, newly_seen_posts)

    if found_delta_boundary:
        return

    print(
        f"  [!] Instagram tidak memuat postingan tambahan @{account_name} setelah "
        f"{len(seen_urls)} postingan; semua postingan yang tersedia sudah diperiksa, "
        f"tetapi batas tanggal {cutoff.date()} belum terlihat."
    )


def main():
    if not API_TOKEN:
        raise RuntimeError("SCRAPER_API_TOKEN belum diatur di scraper/.env.")

    storage_state = Path(__file__).with_name("instagram-state.json")
    cutoff = subtract_months(datetime.now(timezone.utc), TIMELINE_MONTHS)
    print(f"[+] Batas tanggal scraping: {cutoff.date()} (3 bulan terakhir).")

    failures = []
    inaccessible_accounts = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            context_options = {
                "user_agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            }
            if storage_state.is_file():
                context_options["storage_state"] = str(storage_state)
                print("[+] Menggunakan sesi Instagram tersimpan.")
            else:
                print("[+] Mencoba scraping tanpa login (akun publik saja).")

            context = browser.new_context(locale="en-US", **context_options)
            context.route(
                "**/*",
                lambda route: route.abort()
                if route.request.resource_type in {"image", "media", "font", "stylesheet"}
                else route.continue_(),
            )
            profile_page = context.new_page()
            post_page = context.new_page()

            for account in TARGET_ACCOUNTS:
                try:
                    known_posts = get_known_posts(account)
                    process_account(profile_page, post_page, account, cutoff, known_posts)
                except NoPublicPostsError as error:
                    print(f"  [!] @{account}: {error}")
                    inaccessible_accounts.append(account)
                except Exception as error:
                    print(f"  [x] Error pada @{account}: {error}")
                    failures.append(account)
                time.sleep(3)
        finally:
            browser.close()

    if failures:
        failed_accounts = ", ".join(f"@{account}" for account in failures)
        raise RuntimeError(f"Scraper gagal memproses akun: {failed_accounts}")

    if len(inaccessible_accounts) == len(TARGET_ACCOUNTS):
        accounts = ", ".join(f"@{account}" for account in inaccessible_accounts)
        raise RuntimeError(
            "Scraping anonim tidak menemukan postingan yang bisa dibaca pada akun: "
            f"{accounts}. Instagram tidak membuka daftar postingan publik untuk scraper ini."
        )


if __name__ == "__main__":
    main()
