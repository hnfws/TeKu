<?php

use App\Models\BankAccount;
use App\Models\LoanApplication;
use App\Models\LoanInstallment;
use App\Models\LoanPayment;
use App\Models\TeKuModalVoucher;
use App\Models\User;
use App\Services\MidtransSandboxGateway;
use Illuminate\Support\Carbon;
use Midtrans\Config;

test('users can save an encrypted bank account and submit a simulation loan with a schedule', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $pageResponse = $this->get('/tekumodal');
    $pageResponse->assertOk();
    $pageResponse->assertInertia(fn ($page) => $page
        ->component('tekumodal/index')
        ->where('metrics.credit_limit', 100_000_000)
        ->where('metrics.available_limit', 100_000_000)
        ->where('simulator.minimum_loan', 500_000)
        ->where('simulator.daily_interest_rate', 0.06)
        ->where('simulator.monthly_interest_rate', 1.8)
        ->where('simulator.terms', [2, 3, 6, 9, 12, 24])
        ->where('openSimulator', false));
    $this->get('/tekumodal?simulator=1')->assertInertia(fn ($page) => $page
        ->component('tekumodal/index')
        ->where('openSimulator', true));
    $this->get('/tekumodal/loans/create')->assertInertia(fn ($page) => $page
        ->component('tekumodal/loan-form')
        ->where('availableLimit', 100_000_000)
        ->where('creditLimit', 100_000_000)
        ->where('dailyInterestRate', 0.06)
        ->where('monthlyInterestRate', 1.8));
    $this->get('/tekumodal/loans/create?principal=1000000&term_months=6')->assertInertia(fn ($page) => $page
        ->component('tekumodal/loan-form')
        ->where('initialPrincipal', 1_000_000)
        ->where('initialTermMonths', 6));
    $this->get('/tekumodal/bank-accounts/create')->assertInertia(fn ($page) => $page
        ->component('tekumodal/bank-account-form'));

    $this->post('/tekumodal/bank-accounts', [
        'account_holder' => 'Test User',
        'account_number' => '1234-5678-90',
        'bank_name' => 'BCA',
        'branch_name' => 'Pusat',
        'city' => 'Jakarta',
    ])->assertRedirect('/tekumodal');

    $account = BankAccount::query()->firstOrFail();
    expect($account->account_number)->toBe('1234567890')
        ->and($account->getRawOriginal('account_number'))->not->toBe('1234567890');

    $this->post('/tekumodal/loans', [
        'principal' => 500_000,
        'term_months' => 3,
        'bank_account_id' => $account->id,
    ])->assertRedirect('/tekumodal')->assertSessionHas('success');

    $loan = LoanApplication::query()->with('installments')->firstOrFail();
    expect($loan->status)->toBe('simulation_active')
        ->and($loan->monthly_interest_rate)->toBe('1.80')
        ->and($loan->total_interest)->toBe(27_000)
        ->and($loan->total_repayment)->toBe(527_000)
        ->and($loan->installments)->toHaveCount(3)
        ->and($loan->installments->sum('amount'))->toBe(527_000)
        ->and($loan->installments->first()->amount)->toBe(175_667)
        ->and($loan->installments->last()->amount)->toBe(175_666);
});

test('loan applications cannot use another user bank account or exceed the available limit', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $owner->id,
        'account_holder' => 'Owner',
        'account_number' => '123456789',
        'bank_name' => 'BCA',
    ]);

    $this->actingAs($otherUser)->post('/tekumodal/loans', [
        'principal' => 500_000,
        'term_months' => 3,
        'bank_account_id' => $account->id,
    ])->assertNotFound();

    $ownAccount = BankAccount::create([
        'user_id' => $otherUser->id,
        'account_holder' => 'Other',
        'account_number' => '987654321',
        'bank_name' => 'BCA',
    ]);
    LoanApplication::create([
        'user_id' => $otherUser->id,
        'bank_account_id' => $ownAccount->id,
        'principal' => 99_700_000,
        'term_months' => 3,
        'monthly_interest_rate' => 2,
        'total_interest' => 5_982_000,
        'total_repayment' => 105_682_000,
        'status' => 'simulation_active',
    ]);

    $this->from('/tekumodal/loans/create')->post('/tekumodal/loans', [
        'principal' => 500_000,
        'term_months' => 3,
        'bank_account_id' => $ownAccount->id,
    ])->assertRedirect('/tekumodal/loans/create')->assertSessionHasErrors('principal');

    expect(LoanApplication::query()->where('user_id', $otherUser->id)->count())->toBe(1);
});

test('five on-time installments unlock one one-time 20 percent rent voucher', function () {
    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Test User',
        'account_number' => '123456789',
        'bank_name' => 'BCA',
    ]);
    $loan = LoanApplication::create([
        'user_id' => $user->id,
        'bank_account_id' => $account->id,
        'principal' => 1_000_000,
        'term_months' => 6,
        'monthly_interest_rate' => 2,
        'total_interest' => 120_000,
        'total_repayment' => 1_120_000,
        'status' => 'simulation_active',
    ]);
    foreach (range(1, 5) as $number) {
        LoanInstallment::create([
            'loan_application_id' => $loan->id,
            'installment_number' => $number,
            'due_date' => now()->subMonths(5 - $number)->toDateString(),
            'amount' => 100_000,
            'status' => 'paid',
            'paid_at' => now()->subMonths(5 - $number)->subDay(),
        ]);
    }

    $this->actingAs($user)->get('/tekumodal')
        ->assertInertia(fn ($page) => $page
            ->where('metrics.xp', 100)
            ->where('metrics.can_claim_voucher', true));

    $this->post('/tekumodal/vouchers')->assertRedirect('/tekumodal');
    $voucher = TeKuModalVoucher::query()->firstOrFail();
    expect($voucher->discount_percentage)->toBe(20)
        ->and($voucher->status)->toBe('available')
        ->and($voucher->code)->toStartWith('TEKU20-');

    $this->post('/tekumodal/vouchers')->assertSessionHasErrors('voucher');
    expect(TeKuModalVoucher::query()->count())->toBe(1);
});

test('installment dates preserve monthly day across short months', function () {
    Carbon::setTestNow('2026-01-31 12:00:00');
    try {
        $user = User::factory()->create();
        $account = BankAccount::create([
            'user_id' => $user->id,
            'account_holder' => 'Test User',
            'account_number' => '123456789',
            'bank_name' => 'BCA',
        ]);

        $this->actingAs($user)->post('/tekumodal/loans', [
            'principal' => 500_000,
            'term_months' => 3,
            'bank_account_id' => $account->id,
        ])->assertRedirect('/tekumodal');

        $dates = LoanInstallment::query()
            ->orderBy('installment_number')
            ->pluck('due_date')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->all();
        expect($dates)->toBe(['2026-02-28', '2026-03-31', '2026-04-30']);
    } finally {
        Carbon::setTestNow();
    }
});

test('Midtrans gateway refuses non-sandbox credentials before making provider requests', function () {
    config()->set('services.midtrans.server_key', 'Mid-server-production-key');

    expect(fn () => app(MidtransSandboxGateway::class)->transactionStatus('not-a-real-order'))
        ->toThrow(RuntimeException::class, 'A Midtrans sandbox server key is required.');
});

test('Midtrans checkout sandbox mode depends on the server key, not the unused client key', function () {
    config()->set('services.midtrans.server_key', 'SB-Mid-server-test-key');
    config()->set('services.midtrans.client_key', 'unused-client-key');

    $gateway = app(MidtransSandboxGateway::class);
    $configureSandbox = new ReflectionMethod($gateway, 'configureSandbox');
    $configureSandbox->invoke($gateway);

    expect(Config::$serverKey)->toBe('SB-Mid-server-test-key')
        ->and(Config::$isProduction)->toBeFalse();
});

test('Inertia payment requests are redirected to the Midtrans sandbox checkout', function () {
    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Test User',
        'account_number' => '123456789',
        'bank_name' => 'BCA',
    ]);
    $loan = LoanApplication::create([
        'user_id' => $user->id,
        'bank_account_id' => $account->id,
        'principal' => 500_000,
        'term_months' => 3,
        'monthly_interest_rate' => 2,
        'total_interest' => 30_000,
        'total_repayment' => 530_000,
        'status' => 'simulation_active',
    ]);
    $installment = LoanInstallment::create([
        'loan_application_id' => $loan->id,
        'installment_number' => 1,
        'due_date' => now()->toDateString(),
        'amount' => 1_000,
    ]);
    $checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v4/redirection/test-token';
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldReceive('createRedirectUrl')
        ->once()
        ->andReturn($checkoutUrl);
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->post("/tekumodal/installments/{$installment->id}/payments", ['payment_method' => 'qris'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $checkoutUrl);

    $this->withHeader('X-Inertia', 'true')
        ->post("/tekumodal/installments/{$installment->id}/payments", ['payment_method' => 'qris'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $checkoutUrl);

    expect(LoanPayment::query()->count())->toBe(1)
        ->and(LoanPayment::query()->firstOrFail()->redirect_url)->toBe($checkoutUrl);
});

test('Midtrans notifications require a valid sandbox signature and settle an installment idempotently', function () {
    config()->set('services.midtrans.server_key', 'SB-Mid-server-test-key');

    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Test User',
        'account_number' => '123456789',
        'bank_name' => 'BCA',
    ]);
    $loan = LoanApplication::create([
        'user_id' => $user->id,
        'bank_account_id' => $account->id,
        'principal' => 500_000,
        'term_months' => 3,
        'monthly_interest_rate' => 2,
        'total_interest' => 30_000,
        'total_repayment' => 530_000,
        'status' => 'simulation_active',
    ]);
    $installment = LoanInstallment::create([
        'loan_application_id' => $loan->id,
        'installment_number' => 1,
        'due_date' => now()->toDateString(),
        'amount' => 1_000,
    ]);
    $payment = LoanPayment::create([
        'loan_installment_id' => $installment->id,
        'order_id' => (string) str()->uuid(),
        'payment_method' => 'bca_va',
        'amount' => 1_000,
        'status' => 'pending',
    ]);
    $notification = [
        'order_id' => $payment->order_id,
        'status_code' => '200',
        'gross_amount' => '1000.00',
        'transaction_status' => 'settlement',
        'transaction_id' => 'sandbox-transaction-1',
    ];

    $this->postJson('/api/midtrans/notifications', $notification)
        ->assertForbidden();
    expect($installment->fresh()->status)->toBe('pending');

    $notification['signature_key'] = hash('sha512', $payment->order_id.'2001000.00SB-Mid-server-test-key');
    $this->postJson('/api/midtrans/notifications', $notification)->assertOk()->assertJson(['received' => true]);
    $this->postJson('/api/midtrans/notifications', $notification)->assertOk()->assertJson(['received' => true]);

    expect($payment->fresh()->status)->toBe('paid')
        ->and($installment->fresh()->status)->toBe('paid')
        ->and($loan->fresh()->status)->toBe('completed');
});
