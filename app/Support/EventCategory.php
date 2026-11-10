<?php

namespace App\Support;

class EventCategory
{
    private const LABELS = [
        'art' => 'Seni',
        'bazaar' => 'Bazar',
        'campus' => 'Kampus',
        'exhibition' => 'Pameran',
        'festival' => 'Festival',
        'music' => 'Musik',
        'sports' => 'Olahraga',
    ];

    private const KEYWORDS = [
        'sports' => ['olahraga', 'sport', 'marathon', 'badminton', 'basket', 'sepak bola'],
        'campus' => ['kampus', 'campus', 'mahasiswa', 'university'],
        'festival' => ['festival', 'fest'],
        'music' => ['musik', 'music', 'konser', 'concert', 'gig', 'band', 'orchestra'],
        'exhibition' => ['pameran', 'exhibition', 'expo', 'galeri', 'gallery'],
        'art' => ['seni', 'art', 'teater', 'theatre', 'theater', 'tari', 'dance'],
        'bazaar' => ['bazaar', 'bazar', 'market', 'tenant', 'booth', 'vendor'],
    ];

    public static function values(): array
    {
        return array_keys(self::LABELS);
    }

    public static function infer(string $text): ?string
    {
        $text = mb_strtolower($text);

        foreach (self::KEYWORDS as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (preg_match('/(?<!\pL)'.preg_quote($keyword, '/').'(?!\pL)/u', $text) === 1) {
                    return $category;
                }
            }
        }

        return null;
    }
}
