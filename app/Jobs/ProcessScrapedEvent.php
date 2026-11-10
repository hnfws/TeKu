<?php

namespace App\Jobs;

use App\Models\Event;
use App\Models\Tenant;
use App\Support\EventCategory;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProcessScrapedEvent implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $uniqueFor = 86400;

    public function __construct(public array $payload) {}

    public function uniqueId(): string
    {
        return $this->payload['instagram_post_url'];
    }

    public function handle(): string
    {
        return DB::transaction(function (): string {
            $accountName = strtolower($this->payload['account_name']);
            $caption = mb_strtolower($this->payload['description'] ?? '');
            $category = $this->payload['category'] ?? EventCategory::infer(
                ($this->payload['title'] ?? '').' '.($this->payload['description'] ?? '')
            );
            $priorityKeywords = config('services.scraper.priority_keywords', []);
            $priorityAccounts = config('services.scraper.priority_accounts', []);
            $keywordPriority = collect($priorityKeywords)->contains(
                fn (string $keyword) => str_contains($caption, mb_strtolower($keyword))
            );
            $accountPriority = in_array($accountName, $priorityAccounts, true);
            $priorityScore = ($keywordPriority ? 50 : 0) + ($accountPriority ? 50 : 0);
            $isPriority = $priorityScore > 0;
            $tenant = Tenant::query()
                ->where('instagram_post_url', $this->payload['instagram_post_url'])
                ->first();
            $isUpdate = $tenant !== null;
            $event = $tenant?->event()->lockForUpdate()->first() ?? new Event;

            $event->fill([
                'title' => $this->payload['title'],
                'category' => $category ?? $event->category ?? 'bazaar',
                'location_name' => $this->payload['location_name'] ?? $event->location_name ?? 'Lokasi Perlu Validasi',
                'start_date' => isset($this->payload['start_date'])
                    ? $this->eventDate($this->payload['start_date'])
                    : $event->start_date,
                'end_date' => isset($this->payload['end_date'])
                    ? $this->eventDate($this->payload['end_date'])
                    : $event->end_date,
                'latitude' => $this->payload['latitude'],
                'longitude' => $this->payload['longitude'],
                'source_url' => $this->payload['registration_link'] ?? $event->source_url,
                'description' => $this->payload['description'] ?? $event->description,
                'price' => array_key_exists('price', $this->payload)
                    ? $this->payload['price']
                    : $event->price,
                'organizer_name' => $accountName,
                'source_account' => $accountName,
                'priority_score' => $priorityScore,
                'is_priority' => DB::getDriverName() === 'pgsql'
                    ? ($isPriority ? 'true' : 'false')
                    : $isPriority,
            ]);
            if (isset($this->payload['image_base64'])) {
                $imageBytes = base64_decode($this->payload['image_base64'], true);
                $imageInfo = $imageBytes === false ? false : @getimagesizefromstring($imageBytes);
                if ($imageBytes === false
                    || $imageInfo === false
                    || $imageInfo['mime'] !== 'image/jpeg'
                    || $imageInfo[0] > 1024
                    || $imageInfo[1] > 1024) {
                    throw new \RuntimeException('Gambar Instagram tidak valid atau bukan JPEG.');
                }

                $imagePath = 'instagram-events/'.hash('sha256', $this->payload['instagram_post_url']).'.jpg';
                if (! Storage::disk('public')->put($imagePath, $imageBytes)) {
                    throw new \RuntimeException('Gambar Instagram gagal disimpan ke storage publik.');
                }

                $event->image_url = Storage::disk('public')->url($imagePath);
            }
            $event->save();

            if (DB::getDriverName() === 'pgsql') {
                DB::statement(
                    'UPDATE events SET location = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
                    [$this->payload['longitude'], $this->payload['latitude'], $event->id]
                );
            }

            $tenant ??= new Tenant;
            $tenant->fill([
                'event_id' => $event->id,
                'tenant_type' => 'curated_call',
                'price' => array_key_exists('tenant_price', $this->payload)
                    ? ($this->payload['tenant_price'] ?? $tenant->price)
                    : ($this->payload['price'] ?? $tenant->price),
                'requirements' => $this->payload['description'] ?? null,
                'registration_link' => $this->payload['registration_link'] ?? $tenant->registration_link,
                'instagram_post_url' => $this->payload['instagram_post_url'],
                'deadline_date' => isset($this->payload['deadline_date'])
                    ? Carbon::parse($this->payload['deadline_date'])
                    : $tenant->deadline_date,
            ]);
            $tenant->save();

            return $isUpdate ? 'updated' : 'created';
        });
    }

    private function eventDate(?string $date): ?string
    {
        return $date === null
            ? null
            : Carbon::parse($date)->setTimezone(config('app.timezone'))->toDateTimeString();
    }
}
