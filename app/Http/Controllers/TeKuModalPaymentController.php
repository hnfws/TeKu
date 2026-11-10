<?php

namespace App\Http\Controllers;

use App\Models\LoanInstallment;
use App\Models\LoanPayment;
use App\Models\TenantBooking;
use App\Services\MidtransSandboxGateway;
use App\Services\TeKuModalRewards;
use App\Services\TenantBookingPayments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class TeKuModalPaymentController extends Controller
{
    public function initiate(Request $request, LoanInstallment $installment, MidtransSandboxGateway $gateway): SymfonyResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', Rule::in(array_values(config('tekumodal.payment_methods')))],
        ]);
        $installment = LoanInstallment::query()
            ->whereKey($installment->id)
            ->whereHas('loanApplication', fn ($query) => $query->where('user_id', $request->user()->id))
            ->firstOrFail();

        $payment = DB::transaction(function () use ($installment, $validated) {
            $lockedInstallment = LoanInstallment::query()->lockForUpdate()->findOrFail($installment->id);
            if ($lockedInstallment->status === 'paid') {
                throw ValidationException::withMessages(['payment_method' => 'Tagihan ini sudah lunas.']);
            }

            $existingPayment = $lockedInstallment->payments()
                ->where('status', 'pending')
                ->latest()
                ->first();
            if ($existingPayment) {
                if (! $existingPayment->redirect_url) {
                    throw ValidationException::withMessages([
                        'payment_method' => 'Checkout sedang disiapkan. Tunggu sebentar lalu coba lagi.',
                    ]);
                }

                return $existingPayment;
            }

            return $lockedInstallment->payments()->create([
                'order_id' => (string) str()->uuid(),
                'payment_method' => $validated['payment_method'],
                'amount' => $lockedInstallment->amount,
                'status' => 'pending',
            ]);
        });

        if ($payment->redirect_url) {
            $request->session()->put('tekumodal.payment_animation.'.$payment->id, true);

            return Inertia::location($payment->redirect_url);
        }

        try {
            $redirectUrl = $gateway->createRedirectUrl($payment, $installment, $request->user());
        } catch (\Exception $exception) {
            Log::warning('Midtrans sandbox checkout could not be created.', [
                'payment_id' => $payment->id,
                'exception' => $exception::class,
            ]);
            $payment->update(['status' => 'failed']);

            return back()->withErrors([
                'payment_method' => 'Checkout sandbox tidak dapat dibuat. Periksa konfigurasi Midtrans sandbox lalu coba lagi.',
            ]);
        }

        $payment->update(['redirect_url' => $redirectUrl]);
        $request->session()->put('tekumodal.payment_animation.'.$payment->id, true);

        return Inertia::location($redirectUrl);
    }

    public function returnFromProvider(
        Request $request,
        LoanPayment $payment,
        MidtransSandboxGateway $gateway,
        TeKuModalRewards $rewards,
    ): Response {
        $payment->load('installment.loanApplication');
        abort_unless($payment->installment->loanApplication->user_id === $request->user()->id, 404);
        if ($request->boolean('from_checkout')) {
            $request->session()->put('tekumodal.payment_animation.'.$payment->id, true);
        }
        $statusCheckError = false;

        if ($payment->status === 'pending') {
            try {
                $status = (array) $gateway->transactionStatus($payment->order_id);
                if (($status['order_id'] ?? null) !== $payment->order_id) {
                    Log::warning('Midtrans sandbox status order did not match the stored payment.', ['payment_id' => $payment->id]);
                    $statusCheckError = true;
                } else {
                    $this->applyProviderStatus($payment, $status);
                    $payment->refresh();
                }
            } catch (\Exception $exception) {
                Log::info('Midtrans sandbox status is not available yet.', [
                    'payment_id' => $payment->id,
                    'exception' => $exception::class,
                ]);
                $statusCheckError = true;
            }
        }

        $user = $request->user();
        $dueDate = Carbon::parse($payment->installment->due_date);
        $paidInstallments = $rewards->onTimeInstallments($user);
        $xp = $rewards->xp($paidInstallments);
        $eligiblePayment = $payment->status === 'paid'
            && $payment->paid_at
            && $payment->paid_at->toDateString() <= $dueDate->toDateString();
        $previousXp = $rewards->xp(max(0, $paidInstallments - ($eligiblePayment ? 1 : 0)));
        $earnedRewardPoints = $eligiblePayment && $rewards->earnsPointsAt($paidInstallments);
        $constellationXp = $earnedRewardPoints ? 100 : $xp;
        $scrollToConstellation = $payment->status === 'paid'
            && (bool) $request->session()->pull('tekumodal.payment_animation.'.$payment->id, false);
        $activePrincipal = $user->loanApplications()
            ->where('status', 'simulation_active')
            ->sum('principal');

        return Inertia::render('tekumodal/payment-result', [
            'payment' => [
                'id' => $payment->id,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'order_id' => $payment->order_id,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'installment_number' => $payment->installment->installment_number,
                'installment_id' => $payment->installment->id,
                'payment_method' => $payment->payment_method,
                'due_date' => $dueDate->toDateString(),
            ],
            'statusCheckError' => $statusCheckError,
            'summary' => [
                'credit_limit' => (int) config('tekumodal.credit_limit'),
                'available_limit' => max(0, (int) config('tekumodal.credit_limit') - (int) $activePrincipal),
                'period' => $dueDate->gt(now()->endOfMonth()) ? 'next' : 'current',
                'month_label' => $dueDate->translatedFormat('F Y'),
                'xp' => $xp,
                'previous_xp' => $previousXp,
                'constellation_xp' => $constellationXp,
                'points_balance' => $rewards->pointsBalance($user, $paidInstallments),
                'points_earned_now' => $scrollToConstellation && $earnedRewardPoints
                    ? (int) config('tekumodal.points_per_reward')
                    : 0,
                'paid_installments' => $paidInstallments,
                'scroll_to_constellation' => $scrollToConstellation,
                'animate_constellation' => $scrollToConstellation && $eligiblePayment && ($earnedRewardPoints || $xp > $previousXp),
            ],
        ]);
    }

    public function notification(
        Request $request,
        MidtransSandboxGateway $gateway,
        TenantBookingPayments $tenantBookingPayments,
    ): JsonResponse {
        $notification = $request->json()->all();
        if (! $gateway->verifyNotificationSignature($notification)) {
            Log::warning('Rejected invalid Midtrans sandbox notification signature.');
            abort(403);
        }

        $payment = LoanPayment::query()->where('order_id', $notification['order_id'])->first();
        if ($payment) {
            if (! $this->amountMatches($notification['gross_amount'], $payment->amount)) {
                Log::warning('Rejected Midtrans notification with an amount mismatch.', ['payment_id' => $payment->id]);
                abort(422);
            }

            $this->applyProviderStatus($payment, $notification);
        } else {
            $booking = TenantBooking::query()->where('order_id', $notification['order_id'])->firstOrFail();
            if (! $this->amountMatches($notification['gross_amount'], $booking->amount)) {
                Log::warning('Rejected Midtrans notification with an amount mismatch.', [
                    'tenant_booking_id' => $booking->id,
                ]);
                abort(422);
            }

            $tenantBookingPayments->applyProviderStatus($booking, $notification);
        }

        return response()->json(['received' => true]);
    }

    private function applyProviderStatus(LoanPayment $payment, array $providerStatus): void
    {
        if (! $this->amountMatches((string) ($providerStatus['gross_amount'] ?? ''), $payment->amount)) {
            Log::warning('Ignored Midtrans status with an amount mismatch.', ['payment_id' => $payment->id]);

            return;
        }

        $status = $providerStatus['transaction_status'] ?? null;
        $isPaid = ($status === 'settlement' && (string) ($providerStatus['status_code'] ?? '') === '200')
            || ($status === 'capture'
                && (string) ($providerStatus['status_code'] ?? '') === '200'
                && ($providerStatus['fraud_status'] ?? null) === 'accept');

        DB::transaction(function () use ($payment, $providerStatus, $status, $isPaid) {
            $lockedPayment = LoanPayment::query()->lockForUpdate()->findOrFail($payment->id);
            $installment = LoanInstallment::query()
                ->lockForUpdate()
                ->findOrFail($lockedPayment->loan_installment_id);

            if ($lockedPayment->status === 'paid') {
                return;
            }

            if ($isPaid) {
                if ($installment->status === 'paid') {
                    $lockedPayment->update([
                        'status' => 'duplicate_paid',
                        'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                    ]);
                    Log::critical('Multiple sandbox payments settled for one installment.', [
                        'payment_id' => $lockedPayment->id,
                        'installment_id' => $installment->id,
                    ]);

                    return;
                }

                $paidAt = now();
                $lockedPayment->update([
                    'status' => 'paid',
                    'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                    'paid_at' => $paidAt,
                ]);
                $installment->update(['status' => 'paid', 'paid_at' => $paidAt]);

                $loan = $installment->loanApplication;
                if (! $loan->installments()->where('status', '!=', 'paid')->exists()) {
                    $loan->update(['status' => 'completed']);
                }

                return;
            }

            if (in_array($status, ['deny', 'expire', 'cancel'], true)) {
                $lockedPayment->update([
                    'status' => $status === 'deny' ? 'failed' : $status,
                    'provider_transaction_id' => $providerStatus['transaction_id'] ?? null,
                ]);
            }
        });
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
