<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\TeKuModalVoucher;
use App\Models\Tenant;
use App\Models\TenantBooking;
use App\Services\MidtransSandboxGateway;
use App\Services\TenantBookingPayments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class TenantBookingController extends Controller
{
    public function store(
        Request $request,
        Event $event,
        Tenant $tenant,
        MidtransSandboxGateway $gateway,
    ): SymfonyResponse|RedirectResponse {
        abort_unless($tenant->event_id === $event->id, 404);

        $validated = $request->validate([
            'payment_method' => ['required', Rule::in(array_values(config('tekumodal.payment_methods')))],
            'voucher_id' => ['nullable', 'integer', 'exists:te_ku_modal_vouchers,id'],
        ]);
        if ($tenant->tenant_type !== 'direct_rent' || $tenant->price === null || (int) $tenant->price < 1) {
            throw ValidationException::withMessages([
                'tenant' => 'Tenant ini belum menyediakan sewa langsung dengan harga yang dapat dibayar.',
            ]);
        }
        if ($tenant->deadline_date && Carbon::parse($tenant->deadline_date)->isPast()) {
            throw ValidationException::withMessages([
                'tenant' => 'Batas pendaftaran sewa tenant sudah lewat.',
            ]);
        }

        $booking = DB::transaction(function () use ($request, $tenant, $validated) {
            $voucher = null;
            $discount = 0;
            if (! empty($validated['voucher_id'])) {
                $voucher = TeKuModalVoucher::query()
                    ->where('user_id', $request->user()->id)
                    ->where('status', 'available')
                    ->whereIn('type', ['tenant_discount_10', 'tenant_discount_20'])
                    ->lockForUpdate()
                    ->find($validated['voucher_id']);

                if (! $voucher) {
                    throw ValidationException::withMessages([
                        'voucher_id' => 'Voucher tenant tidak tersedia atau sudah digunakan.',
                    ]);
                }

                $discount = (int) round((int) $tenant->price * $voucher->discount_percentage / 100);
                if ($voucher->max_discount_amount !== null) {
                    $discount = min($discount, $voucher->max_discount_amount);
                }
                $discount = min($discount, (int) $tenant->price);
                $voucher->update(['status' => 'reserved']);
            }

            return TenantBooking::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()->id,
                'voucher_id' => $voucher?->id,
                'order_id' => (string) Str::uuid(),
                'payment_method' => $validated['payment_method'],
                'base_amount' => (int) $tenant->price,
                'discount_amount' => $discount,
                'amount' => (int) $tenant->price - $discount,
                'status' => 'pending',
            ]);
        });

        try {
            $redirectUrl = $gateway->createTenantBookingRedirectUrl($booking, $tenant, $request->user());
        } catch (\Exception $exception) {
            Log::warning('Midtrans sandbox tenant checkout could not be created.', [
                'tenant_booking_id' => $booking->id,
                'exception' => $exception::class,
            ]);
            $this->failBooking($booking);

            return back()->withErrors([
                'payment_method' => 'Checkout sandbox tidak dapat dibuat. Periksa konfigurasi Midtrans sandbox lalu coba lagi.',
            ]);
        }

        $booking->update(['redirect_url' => $redirectUrl]);

        return Inertia::location($redirectUrl);
    }

    public function returnFromProvider(
        Request $request,
        TenantBooking $booking,
        MidtransSandboxGateway $gateway,
        TenantBookingPayments $payments,
    ): RedirectResponse {
        abort_unless($booking->user_id === $request->user()->id, 404);
        $statusCheckError = false;

        if ($booking->status === 'pending') {
            try {
                $status = (array) $gateway->transactionStatus($booking->order_id);
                if (($status['order_id'] ?? null) !== $booking->order_id) {
                    Log::warning('Midtrans tenant booking status order did not match the stored booking.', [
                        'tenant_booking_id' => $booking->id,
                    ]);
                    $statusCheckError = true;
                } else {
                    $payments->applyProviderStatus($booking, $status);
                    $booking->refresh();
                }
            } catch (\Exception $exception) {
                Log::info('Midtrans tenant booking status is not available yet.', [
                    'tenant_booking_id' => $booking->id,
                    'exception' => $exception::class,
                ]);
                $statusCheckError = true;
            }
        }

        $message = match ($booking->status) {
            'paid' => 'Pembayaran sewa tenant berhasil. Booking sandbox tercatat.',
            'pending' => $statusCheckError
                ? 'Status pembayaran belum dapat diverifikasi. Silakan muat ulang halaman beberapa saat lagi.'
                : 'Pembayaran masih menunggu konfirmasi Midtrans.',
            default => 'Pembayaran sewa tenant tidak berhasil. Voucher yang digunakan sudah tersedia kembali.',
        };

        return to_route('events.show', $booking->tenant->event_id)
            ->with($booking->status === 'paid' ? 'success' : 'error', $message);
    }

    private function failBooking(TenantBooking $booking): void
    {
        DB::transaction(function () use ($booking) {
            TenantBooking::query()->lockForUpdate()->findOrFail($booking->id)->update(['status' => 'failed']);
            if ($booking->voucher_id) {
                TeKuModalVoucher::query()
                    ->whereKey($booking->voucher_id)
                    ->where('status', 'reserved')
                    ->update(['status' => 'available']);
            }
        });
    }
}
