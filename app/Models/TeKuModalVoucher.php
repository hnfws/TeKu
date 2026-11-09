<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeKuModalVoucher extends Model
{
    protected $fillable = [
        'user_id',
        'loan_application_id',
        'code',
        'type',
        'points_cost',
        'discount_percentage',
        'max_discount_amount',
        'interest_rate',
        'status',
        'claimed_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'discount_percentage' => 'integer',
            'points_cost' => 'integer',
            'max_discount_amount' => 'integer',
            'interest_rate' => 'decimal:2',
            'claimed_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenantBookings(): HasMany
    {
        return $this->hasMany(TenantBooking::class, 'voucher_id');
    }
}
