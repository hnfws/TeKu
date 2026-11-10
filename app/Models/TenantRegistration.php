<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantRegistration extends Model
{
    protected $fillable = ['tenant_id', 'user_id', 'registered_at'];

    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
            'email_reminded_at' => 'datetime',
            'browser_reminded_at' => 'datetime',
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
}
