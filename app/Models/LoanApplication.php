<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanApplication extends Model
{
    protected $fillable = [
        'user_id',
        'bank_account_id',
        'principal',
        'term_months',
        'monthly_interest_rate',
        'total_interest',
        'total_repayment',
        'status',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'integer',
            'term_months' => 'integer',
            'monthly_interest_rate' => 'decimal:2',
            'total_interest' => 'integer',
            'total_repayment' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(LoanInstallment::class);
    }
}
