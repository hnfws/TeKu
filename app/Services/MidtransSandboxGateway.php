<?php

namespace App\Services;

use App\Models\LoanInstallment;
use App\Models\LoanPayment;
use App\Models\Tenant;
use App\Models\TenantBooking;
use App\Models\User;
use Illuminate\Support\Facades\URL;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;
use RuntimeException;

class MidtransSandboxGateway
{
    private const PAYMENT_METHODS = [
        'gopay' => 'gopay',
        'ovo' => 'ovo',
        'dana' => 'dana',
        'qris' => 'qris',
        'bca_va' => 'bca_va',
        'bni_va' => 'bni_va',
        'bri_va' => 'bri_va',
        'mandiri_va' => 'echannel',
        'btn_va' => 'btn_va',
        'cimb_va' => 'cimb_va',
        'bsi_va' => 'bsi_va',
        'danamon_va' => 'danamon_va',
        'other_va' => 'other_va',
    ];

    public function createRedirectUrl(LoanPayment $payment, LoanInstallment $installment, User $user): string
    {
        $this->configureSandbox();

        $enabledPayment = self::PAYMENT_METHODS[$payment->payment_method] ?? null;
        if ($enabledPayment === null) {
            throw new RuntimeException('Unsupported sandbox payment method.');
        }

        Config::$overrideNotifUrl = URL::route('tekumodal.midtrans.notification');

        $response = Snap::createTransaction([
            'transaction_details' => [
                'order_id' => $payment->order_id,
                'gross_amount' => $payment->amount,
            ],
            'item_details' => [[
                'id' => 'installment-'.$installment->id,
                'price' => $payment->amount,
                'quantity' => 1,
                'name' => 'Cicilan simulasi '.$installment->installment_number,
            ]],
            'customer_details' => [
                'first_name' => $user->name,
                'email' => $user->email,
            ],
            'enabled_payments' => [$enabledPayment],
            'callbacks' => [
                'finish' => URL::route('tekumodal.payments.return', [
                    'payment' => $payment->id,
                    'from_checkout' => 1,
                ]),
            ],
            'expiry' => [
                'unit' => 'hour',
                'duration' => 1,
            ],
        ]);

        $redirectUrl = $response->redirect_url ?? null;
        if (! is_string($redirectUrl) || ! str_starts_with($redirectUrl, 'https://app.sandbox.midtrans.com/')) {
            throw new RuntimeException('Midtrans did not return a valid sandbox checkout URL.');
        }

        return $redirectUrl;
    }

    public function createTenantBookingRedirectUrl(TenantBooking $booking, Tenant $tenant, User $user): string
    {
        $this->configureSandbox();

        $enabledPayment = self::PAYMENT_METHODS[$booking->payment_method] ?? null;
        if ($enabledPayment === null) {
            throw new RuntimeException('Unsupported sandbox payment method.');
        }

        Config::$overrideNotifUrl = URL::route('tekumodal.midtrans.notification');
        $event = $tenant->event;

        $response = Snap::createTransaction([
            'transaction_details' => [
                'order_id' => $booking->order_id,
                'gross_amount' => $booking->amount,
            ],
            'item_details' => [[
                'id' => 'tenant-'.$tenant->id,
                'price' => $booking->amount,
                'quantity' => 1,
                'name' => 'Sewa tenant: '.mb_substr($event?->title ?? 'Event', 0, 40),
            ]],
            'customer_details' => [
                'first_name' => $user->name,
                'email' => $user->email,
            ],
            'enabled_payments' => [$enabledPayment],
            'callbacks' => [
                'finish' => URL::route('tenant-bookings.return', $booking),
            ],
            'expiry' => [
                'unit' => 'hour',
                'duration' => 1,
            ],
        ]);

        $redirectUrl = $response->redirect_url ?? null;
        if (! is_string($redirectUrl) || ! str_starts_with($redirectUrl, 'https://app.sandbox.midtrans.com/')) {
            throw new RuntimeException('Midtrans did not return a valid sandbox checkout URL.');
        }

        return $redirectUrl;
    }

    public function transactionStatus(string $orderId): object
    {
        $this->configureSandbox();

        return Transaction::status($orderId);
    }

    public function verifyNotificationSignature(array $notification): bool
    {
        $serverKey = (string) config('services.midtrans.server_key');
        if (! str_starts_with($serverKey, 'SB-Mid-server-')) {
            return false;
        }

        foreach (['order_id', 'status_code', 'gross_amount', 'signature_key'] as $required) {
            if (! isset($notification[$required]) || ! is_string($notification[$required])) {
                return false;
            }
        }

        $expected = hash('sha512', $notification['order_id'].$notification['status_code'].$notification['gross_amount'].$serverKey);

        return hash_equals($expected, $notification['signature_key']);
    }

    private function configureSandbox(): void
    {
        $serverKey = (string) config('services.midtrans.server_key');
        if (! str_starts_with($serverKey, 'SB-Mid-server-')) {
            throw new RuntimeException('A Midtrans sandbox server key is required.');
        }

        Config::$serverKey = $serverKey;
        Config::$isProduction = false;
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }
}
