<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\LoanApplication;
use App\Models\LoanInstallment;
use App\Models\TeKuModalVoucher;
use App\Models\User;
use App\Http\Requests\Settings\StoreBankAccountRequest;
use App\Services\TeKuModalRewards;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeKuModalController extends Controller
{
    public function index(Request $request, TeKuModalRewards $rewards): Response
    {
        $user = $request->user();
        $period = $request->validate(['period' => ['nullable', Rule::in(['current', 'next'])]])['period'] ?? 'current';
        $month = now()->startOfMonth()->addMonths($period === 'next' ? 1 : 0);
        $periodStart = $month->copy()->startOfMonth();
        $periodEnd = $month->copy()->endOfMonth();

        $installments = LoanInstallment::query()
            ->whereHas('loanApplication', fn ($query) => $query
                ->where('user_id', $user->id)
                ->whereIn('status', ['simulation_active', 'completed']))
            ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->with([
                'loanApplication:id,principal,term_months,status',
                'payments' => fn ($query) => $query->latest()->limit(1),
            ])
            ->orderBy('due_date')
            ->get()
            ->map(fn (LoanInstallment $installment) => [
                'id' => $installment->id,
                'number' => $installment->installment_number,
                'due_date' => $installment->due_date->toDateString(),
                'amount' => $installment->amount,
                'status' => $installment->status,
                'paid_at' => $installment->paid_at?->toIso8601String(),
                'principal' => $installment->loanApplication->principal,
                'term_months' => $installment->loanApplication->term_months,
                'latest_payment' => $installment->payments->first()
                    ? [
                        'id' => $installment->payments->first()->id,
                        'status' => $installment->payments->first()->status,
                        'payment_method' => $installment->payments->first()->payment_method,
                    ]
                    : null,
            ]);

        $paidInstallments = $rewards->onTimeInstallments($user);
        $pointsBalance = $rewards->pointsBalance($user, $paidInstallments);
        $ownedVouchers = $user->tekumodalVouchers()->latest('claimed_at')->limit(20)->get();
        $rewardCatalog = collect(config('tekumodal.rewards'))->map(function (array $reward) use ($user, $pointsBalance, $ownedVouchers, $rewards) {
            $ownedVoucher = $ownedVouchers->first(fn (TeKuModalVoucher $voucher) => $voucher->type === $reward['type'] && $voucher->status === 'available');
            $hasOwnedVoucher = $ownedVouchers->contains(fn (TeKuModalVoucher $voucher) => $voucher->type === $reward['type']);
            $canRedeem = ! $hasOwnedVoucher && $rewards->canRedeem($user, $reward, $pointsBalance);

            return [
                ...$reward,
                'can_redeem' => $canRedeem,
                'owned_voucher_id' => $ownedVoucher?->id,
                'has_owned_voucher' => $hasOwnedVoucher,
            ];
        })->values();
        $activePrincipal = $user->loanApplications()->where('status', 'simulation_active')->sum('principal');

        return Inertia::render('tekumodal/index', [
            'period' => $period,
            'monthLabel' => $month->translatedFormat('F Y'),
            'openSimulator' => $request->query('simulator') === '1',
            'simulator' => [
                'credit_limit' => (int) config('tekumodal.credit_limit'),
                'minimum_loan' => (int) config('tekumodal.minimum_loan'),
                'daily_interest_rate' => (float) config('tekumodal.daily_interest_rate'),
                'interest_days_per_month' => (int) config('tekumodal.interest_days_per_month'),
                'monthly_interest_rate' => (float) config('tekumodal.monthly_interest_rate'),
                'terms' => config('tekumodal.terms'),
            ],
            'installments' => $installments,
            'loans' => $user->loanApplications()
                ->withCount('installments')
                ->latest()
                ->limit(5)
                ->get(['id', 'principal', 'term_months', 'monthly_interest_rate', 'total_interest', 'total_repayment', 'status', 'created_at']),
            'bankAccounts' => $user->bankAccounts()
                ->latest()
                ->get(['id', 'bank_name', 'account_holder', 'account_number'])
                ->map(fn (BankAccount $account) => [
                    'id' => $account->id,
                    'bank_name' => $account->bank_name,
                    'account_holder' => $account->account_holder,
                    'masked_number' => '•••• '.substr(preg_replace('/\D/', '', $account->account_number) ?? '', -4),
                ]),
            'metrics' => [
                'credit_limit' => (int) config('tekumodal.credit_limit'),
                'available_limit' => max(0, (int) config('tekumodal.credit_limit') - (int) $activePrincipal),
                'active_principal' => (int) $activePrincipal,
                'xp' => $rewards->xp($paidInstallments),
                'paid_installments' => $paidInstallments,
                'points_balance' => $pointsBalance,
                'points_per_reward' => (int) config('tekumodal.points_per_reward'),
            ],
            'rewards' => $rewardCatalog,
            'vouchers' => $ownedVouchers->map(fn (TeKuModalVoucher $voucher) => [
                'id' => $voucher->id,
                'code' => $voucher->code,
                'type' => $voucher->type,
                'points_cost' => $voucher->points_cost,
                'discount_percentage' => $voucher->discount_percentage,
                'max_discount_amount' => $voucher->max_discount_amount,
                'interest_rate' => $voucher->interest_rate,
                'status' => $voucher->status,
                'claimed_at' => $voucher->claimed_at,
            ]),
            'paymentMethods' => collect(config('tekumodal.payment_methods'))
                ->map(fn (string $code, string $label) => ['label' => $label, 'code' => $code])
                ->values(),
            'successMessage' => $request->session()->get('success'),
        ]);
    }

    public function createLoan(Request $request): Response
    {
        $user = $request->user();
        $activePrincipal = (int) $user->loanApplications()->where('status', 'simulation_active')->sum('principal');
        $availableLimit = max(0, (int) config('tekumodal.credit_limit') - $activePrincipal);
        $initialPrincipal = filter_var($request->query('principal'), FILTER_VALIDATE_INT);
        $initialTerm = filter_var($request->query('term_months'), FILTER_VALIDATE_INT);
        $interestVouchers = $user->tekumodalVouchers()
            ->where('status', 'available')
            ->whereIn('type', ['first_loan_interest', 'loan_interest_145'])
            ->get(['id', 'code', 'type', 'interest_rate']);
        $selectedVoucherId = filter_var($request->query('voucher_id'), FILTER_VALIDATE_INT);
        if ($selectedVoucherId === false || ! $interestVouchers->contains('id', $selectedVoucherId)) {
            $selectedVoucherId = null;
        }

        return Inertia::render('tekumodal/loan-form', [
            'availableLimit' => $availableLimit,
            'creditLimit' => (int) config('tekumodal.credit_limit'),
            'minimumLoan' => (int) config('tekumodal.minimum_loan'),
            'dailyInterestRate' => (float) config('tekumodal.daily_interest_rate'),
            'interestDaysPerMonth' => (int) config('tekumodal.interest_days_per_month'),
            'monthlyInterestRate' => (float) config('tekumodal.monthly_interest_rate'),
            'terms' => config('tekumodal.terms'),
            'initialPrincipal' => $initialPrincipal !== false
                && $initialPrincipal >= (int) config('tekumodal.minimum_loan')
                && $initialPrincipal <= $availableLimit
                    ? $initialPrincipal
                    : '',
            'initialTermMonths' => $initialTerm !== false && in_array($initialTerm, config('tekumodal.terms'), true)
                ? $initialTerm
                : config('tekumodal.terms')[0],
            'bankAccounts' => $user->bankAccounts()
                ->latest()
                ->get(['id', 'bank_name', 'account_holder', 'account_number'])
                ->map(fn (BankAccount $account) => [
                    'id' => $account->id,
                    'bank_name' => $account->bank_name,
                    'account_holder' => $account->account_holder,
                    'masked_number' => '•••• '.substr(preg_replace('/\D/', '', $account->account_number) ?? '', -4),
                ]),
            'interestVouchers' => $interestVouchers,
            'selectedVoucherId' => $selectedVoucherId,
        ]);
    }

    public function storeLoan(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'principal' => ['required', 'integer', 'min:'.config('tekumodal.minimum_loan'), 'max:'.config('tekumodal.credit_limit')],
            'term_months' => ['required', 'integer', Rule::in(config('tekumodal.terms'))],
            'bank_account_id' => ['required', 'integer', 'exists:bank_accounts,id'],
            'tekumodal_voucher_id' => ['nullable', 'integer', 'exists:te_ku_modal_vouchers,id'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $bankAccount = BankAccount::query()
                ->where('user_id', $user->id)
                ->find($validated['bank_account_id']);
            if (! $bankAccount) {
                abort(404);
            }

            $principal = (int) $validated['principal'];
            $limit = (int) config('tekumodal.credit_limit');
            $activePrincipal = (int) $user->loanApplications()->where('status', 'simulation_active')->sum('principal');
            if ($principal > $limit - $activePrincipal) {
                throw ValidationException::withMessages([
                    'principal' => 'Jumlah pengajuan melebihi limit tersedia Rp'.number_format(max(0, $limit - $activePrincipal), 0, ',', '.').'.',
                ]);
            }

            $term = (int) $validated['term_months'];
            $voucher = null;
            if (! empty($validated['tekumodal_voucher_id'])) {
                $voucher = TeKuModalVoucher::query()
                    ->where('user_id', $user->id)
                    ->where('status', 'available')
                    ->whereIn('type', ['first_loan_interest', 'loan_interest_145'])
                    ->lockForUpdate()
                    ->find($validated['tekumodal_voucher_id']);

                if (! $voucher || ($voucher->type === 'first_loan_interest' && $user->loanApplications()->exists())) {
                    throw ValidationException::withMessages([
                        'tekumodal_voucher_id' => 'Voucher bunga ini tidak tersedia atau sudah tidak memenuhi syarat.',
                    ]);
                }
            }

            $rate = $voucher?->interest_rate ?? (float) config('tekumodal.monthly_interest_rate');
            $totalInterest = (int) round($principal * ($rate / 100) * $term);
            $totalRepayment = $principal + $totalInterest;
            $baseInstallment = (int) round($totalRepayment / $term);
            $lastInstallment = $totalRepayment - ($baseInstallment * ($term - 1));
            $today = now();

            $loan = LoanApplication::create([
                'user_id' => $user->id,
                'bank_account_id' => $bankAccount->id,
                'principal' => $principal,
                'term_months' => $term,
                'monthly_interest_rate' => $rate,
                'total_interest' => $totalInterest,
                'total_repayment' => $totalRepayment,
                'status' => 'simulation_active',
                'approved_at' => now(),
            ]);
            if ($voucher) {
                $voucher->update([
                    'status' => 'used',
                    'used_at' => now(),
                    'loan_application_id' => $loan->id,
                ]);
            }
            if ($user->loanApplications()->count() === 1) {
                $user->tekumodalVouchers()
                    ->where('type', 'first_loan_interest')
                    ->where('status', 'available')
                    ->update(['status' => 'expired']);
            }

            for ($number = 1; $number <= $term; $number++) {
                LoanInstallment::create([
                    'loan_application_id' => $loan->id,
                    'installment_number' => $number,
                    'due_date' => $today->copy()->addMonthsNoOverflow($number)->toDateString(),
                    'amount' => $number === $term ? $lastInstallment : $baseInstallment,
                ]);
            }
        });

        return to_route('tekumodal.index')->with('success', 'Pengajuan simulasi disetujui. Tidak ada dana yang dicairkan.');
    }

    public function createBankAccount(): Response
    {
        return Inertia::render('tekumodal/bank-account-form', [
            'banks' => config('tekumodal.banks'),
        ]);
    }

    public function storeBankAccount(StoreBankAccountRequest $request): RedirectResponse
    {
        $request->user()->bankAccounts()->create($request->normalizedData());

        return to_route('tekumodal.index')->with('success', 'Rekening bank berhasil disimpan secara terenkripsi.');
    }

    public function redeemVoucher(Request $request, TeKuModalRewards $rewards): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(collect(config('tekumodal.rewards'))->pluck('type')->all())],
        ]);

        $voucher = DB::transaction(function () use ($request, $validated, $rewards) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $reward = $rewards->rewardFor($validated['type']);
            if (! $reward) {
                throw ValidationException::withMessages([
                    'voucher' => 'Voucher yang dipilih tidak tersedia.',
                ]);
            }

            $pointsBalance = $rewards->pointsBalance($user);
            if (! $rewards->canRedeem($user, $reward, $pointsBalance)) {
                throw ValidationException::withMessages([
                    'voucher' => $reward['first_loan_only']
                        ? 'Voucher ini hanya tersedia untuk pinjaman pertama.'
                        : 'TekuPoint kamu belum cukup untuk menukar voucher ini.',
                ]);
            }

            return $rewards->createVoucher($user, $reward);
        });

        if ($voucher->type === 'first_loan_interest') {
            return to_route('tekumodal.loans.create', ['voucher_id' => $voucher->id])
                ->with('success', 'Voucher pinjaman pertama siap digunakan.');
        }

        return to_route('tekumodal.index')->with('success', 'Voucher berhasil ditukar dan ditambahkan ke daftar voucher kamu.');
    }
}
