<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\LoanApplication;
use App\Models\LoanInstallment;
use App\Models\TeKuModalVoucher;
use App\Models\User;
use App\Http\Requests\Settings\StoreBankAccountRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeKuModalController extends Controller
{
    public function index(Request $request): Response
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

        $paidInstallmentsQuery = LoanInstallment::query()
            ->whereHas('loanApplication', fn ($query) => $query->where('user_id', $user->id))
            ->where('status', 'paid')
            ->whereRaw('DATE(paid_at) <= due_date');
        $paidInstallments = (clone $paidInstallmentsQuery)->count();
        $earnedVouchers = intdiv($paidInstallments, 5);
        $claimedVouchers = $user->tekumodalVouchers()->count();
        $availableVoucherRewards = max(0, $earnedVouchers - $claimedVouchers);
        $streakStart = now()->startOfMonth()->subMonths(4);
        $paidMonths = (clone $paidInstallmentsQuery)
            ->whereBetween('due_date', [$streakStart->toDateString(), now()->endOfMonth()->toDateString()])
            ->pluck('due_date')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m'))
            ->unique()
            ->values();
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
                'xp' => $availableVoucherRewards > 0 ? 100 : ($paidInstallments % 5) * 20,
                'paid_installments' => $paidInstallments,
                'can_claim_voucher' => $availableVoucherRewards > 0,
                'streak' => collect(range(0, 4))
                    ->map(fn (int $offset) => $paidMonths->contains($streakStart->copy()->addMonths($offset)->format('Y-m')))
                    ->all(),
            ],
            'vouchers' => $user->tekumodalVouchers()->latest('claimed_at')->limit(5)->get([
                'id', 'code', 'discount_percentage', 'status', 'claimed_at',
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
        ]);
    }

    public function storeLoan(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'principal' => ['required', 'integer', 'min:'.config('tekumodal.minimum_loan'), 'max:'.config('tekumodal.credit_limit')],
            'term_months' => ['required', 'integer', Rule::in(config('tekumodal.terms'))],
            'bank_account_id' => ['required', 'integer', 'exists:bank_accounts,id'],
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
            $rate = (float) config('tekumodal.monthly_interest_rate');
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

    public function claimVoucher(Request $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $onTimePayments = LoanInstallment::query()
                ->whereHas('loanApplication', fn ($query) => $query->where('user_id', $user->id))
                ->where('status', 'paid')
                ->whereRaw('DATE(paid_at) <= due_date')
                ->count();
            $earnedVouchers = intdiv($onTimePayments, 5);
            if ($user->tekumodalVouchers()->count() >= $earnedVouchers) {
                throw ValidationException::withMessages([
                    'voucher' => 'Bayar 5 cicilan tepat waktu untuk membuka voucher berikutnya.',
                ]);
            }

            do {
                $code = 'TEKU20-'.Str::upper(Str::random(8));
            } while (TeKuModalVoucher::query()->where('code', $code)->exists());

            $user->tekumodalVouchers()->create([
                'code' => $code,
                'discount_percentage' => 20,
                'status' => 'available',
                'claimed_at' => now(),
            ]);
        });

        return to_route('tekumodal.index')->with('success', 'Voucher diskon sewa tenant 20% berhasil diklaim.');
    }
}
