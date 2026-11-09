<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantBooking extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'voucher_id',
        'order_id',
        'payment_method',
        'base_amount',
        'discount_amount',
        'amount',
        'redirect_url',
        'provider_transaction_id',
        'status',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'base_amount' => 'integer',
            'discount_amount' => 'integer',
            'amount' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(TeKuModalVoucher::class, 'voucher_id');
    }
}
