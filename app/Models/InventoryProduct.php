<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class InventoryProduct extends Model
{
    protected $appends = ['image_url'];

    protected $fillable = [
        'user_id',
        'name',
        'sku',
        'category',
        'description',
        'unit',
        'stock_quantity',
        'min_stock',
        'cost_price',
        'selling_price',
        'production_date',
        'expiration_date',
        'image_path',
    ];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'integer',
            'min_stock' => 'integer',
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'production_date' => 'date',
            'expiration_date' => 'date',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }
}
