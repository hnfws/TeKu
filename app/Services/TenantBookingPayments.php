<?php

namespace App\Services;

use App\Models\TeKuModalVoucher;
use App\Models\TenantBooking;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TenantBookingPayments
{
    public function applyProviderStatus(TenantBooking $booking, array $providerStatus): void
    {
        if (! $this->amountMatches((string) ($providerStatus['gross_amount'] ?? ''), $booking->amount)) {
            Log::warning('Ignored tenant booking payment status with an amount mismatch.', [
                'tenant_booking_id' => $booking->id,
            ]);

            return;
        }

        $status = $providerStatus['transaction_status'] ?? null;
        $isPaid = ($status === 'settlement' && (string) ($providerStatus['status_code'] ?? '') === '200')
            || ($status === 'capture'
                && (string) ($providerStatus['status_code'] ?? '') === '200'
                && ($providerStatus['fraud_status'] ?? null) === 'accept');

        DB::transaction(function () use ($booking, $providerStatus, $status, $isPaid) {
            $lockedBooking = TenantBooking::query()->lockForUpdate()->findOrFail($booking->id);
            if ($lockedBooking->status !== 'pending') {
                return;
            }

            if ($isPaid) {
                $lockedBooking->update([
                    'status' => 'paid',
                    'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                    'paid_at' => now(),
                ]);
                $this->updateVoucherStatus($lockedBooking, 'used');

                return;
            }

            if (in_array($status, ['deny', 'expire', 'cancel'], true)) {
                $lockedBooking->update([
                    'status' => match ($status) {
                        'deny' => 'failed',
                        'expire' => 'expired',
                        'cancel' => 'cancelled',
                    },
                    'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                ]);
                $this->updateVoucherStatus($lockedBooking, 'available');
            }
        });
    }

    private function updateVoucherStatus(TenantBooking $booking, string $status): void
    {
        if (! $booking->voucher_id) {
            return;
        }

        TeKuModalVoucher::query()
            ->whereKey($booking->voucher_id)
            ->where('status', 'reserved')
            ->update(['status' => $status]);
    }

    private function amountMatches(string $grossAmount, int $expectedAmount): bool
    {
        if (! preg_match('/^\d+(?:\.\d{1,2})?$/', $grossAmount)) {
            return false;
        }

        [$whole, $fraction] = array_pad(explode('.', $grossAmount, 2), 2, '0');
        $actualCents = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');

        return $actualCents === $expectedAmount * 100;
    }
}
