<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $table = 'event_tenants';

    protected $guarded = ['id'];

    // Relasi Inverse (BelongsTo) ke Event
    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(TenantBooking::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(TenantRegistration::class);
    }
}
