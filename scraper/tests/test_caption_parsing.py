import base64
from io import BytesIO
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from igscrap import compress_post_image, extract_event_title, parse_event_dates, parse_price


class CaptionParsingTest(unittest.TestCase):
    def test_extracts_event_title_from_first_caption_line(self):
        self.assertEqual(
            extract_event_title("Jakarta Food Festival 2026\nPendaftaran tenant dibuka!", "jktgo"),
            "Jakarta Food Festival 2026",
        )

    def test_extracts_title_after_instagram_metadata_and_falls_back_when_empty(self):
        self.assertEqual(
            extract_event_title("20 likes - jktgo on Instagram: \"Jakarta Night Market\"", "jktgo"),
            "Jakarta Night Market",
        )
        self.assertEqual(extract_event_title("#bazaar\n", "jktgo"), "Tenant Call - @jktgo")

    def test_extracts_indonesian_event_date_range_and_tenant_fee(self):
        caption = "Pendaftaran tenant bazaar 12-14 Desember 2026. Harga booth mulai Rp1.500.000."

        self.assertEqual(
            parse_event_dates(caption, datetime(2026, 11, 1, tzinfo=timezone.utc)),
            ("2026-12-12", "2026-12-14"),
        )
        self.assertEqual(parse_price(caption), 1_500_000)

    def test_ignores_registration_deadline_when_an_event_date_is_present(self):
        caption = (
            "Pendaftaran tutup 20 Desember 2026. "
            "Event berlangsung 22-24 Desember 2026. "
            "Hadiah Rp500.000, harga tenant Rp2 juta."
        )

        self.assertEqual(
            parse_event_dates(caption, datetime(2026, 11, 1, tzinfo=timezone.utc)),
            ("2026-12-22", "2026-12-24"),
        )
        self.assertEqual(parse_price(caption), 2_000_000)

    def test_infers_next_year_for_upcoming_date_without_year(self):
        caption = "Event tanggal 12 Januari. Biaya tenant: Rp1,5 juta."

        self.assertEqual(
            parse_event_dates(caption, datetime(2026, 12, 20, tzinfo=timezone.utc)),
            ("2027-01-12", "2027-01-12"),
        )
        self.assertEqual(parse_price(caption), 1_500_000)

    def test_extracts_explicit_numeric_date(self):
        self.assertEqual(
            parse_event_dates(
                "Tanggal event: 12/12/2026",
                datetime(2026, 11, 1, tzinfo=timezone.utc),
            ),
            ("2026-12-12", "2026-12-12"),
        )

    def test_does_not_guess_single_date_or_unlabeled_multiple_prices(self):
        self.assertEqual(
            parse_event_dates(
                "Pendaftaran tutup 20 Desember 2026",
                datetime(2026, 11, 1, tzinfo=timezone.utc),
            ),
            (None, None),
        )
        self.assertIsNone(parse_price("Hadiah Rp500.000 dan uang muka Rp1.000.000"))

    def test_compresses_instagram_images_before_upload(self):
        source = BytesIO()
        Image.new("RGB", (1600, 1200), "green").save(source, format="JPEG")

        class FakeResponse:
            content = source.getvalue()

            def raise_for_status(self):
                return None

        with patch("igscrap.requests.get", return_value=FakeResponse()):
            encoded = compress_post_image("https://cdn.example/image.jpg", "https://instagram.com/p/post/")

        image_bytes = base64.b64decode(encoded)
        with Image.open(BytesIO(image_bytes)) as compressed:
            self.assertLessEqual(max(compressed.size), 1024)
        self.assertLessEqual(len(image_bytes), 240_000)

    def test_uses_browser_request_context_for_instagram_image(self):
        source = BytesIO()
        Image.new("RGB", (80, 60), "green").save(source, format="JPEG")

        class FakeResponse:
            ok = True
            status = 200

            def body(self):
                return source.getvalue()

        class FakeRequest:
            def get(self, url, headers, timeout):
                self.url = url
                self.headers = headers
                self.timeout = timeout
                return FakeResponse()

        class FakePage:
            request = FakeRequest()

        encoded = compress_post_image(
            "https://cdn.example/image.jpg",
            "https://instagram.com/p/post/",
            FakePage(),
        )

        self.assertTrue(base64.b64decode(encoded))


if __name__ == "__main__":
    unittest.main()
