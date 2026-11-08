<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeKuModalVoucher extends Model
{
    protected $fillable = [
        'user_id',
        'code',
        'discount_percentage',
        'status',
        'claimed_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'discount_percentage' => 'integer',
            'claimed_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
