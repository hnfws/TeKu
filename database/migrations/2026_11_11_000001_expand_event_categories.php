<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const CATEGORIES = ['art', 'bazaar', 'campus', 'exhibition', 'festival', 'music', 'sports'];

    private const PREVIOUS_CATEGORIES = ['music', 'bazaar', 'exhibition', 'campus', 'sports'];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check');
        DB::statement($this->categoryConstraint(self::CATEGORIES));
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check');
        DB::statement($this->categoryConstraint(self::PREVIOUS_CATEGORIES));
    }

    private function categoryConstraint(array $categories): string
    {
        $values = implode(', ', array_map(fn (string $category) => "'".$category."'", $categories));

        return "ALTER TABLE events ADD CONSTRAINT events_category_check CHECK (category::text IN ({$values}))";
    }
};
