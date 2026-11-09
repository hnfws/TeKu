import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from igscrap import parse_event_dates, parse_price


class CaptionParsingTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
