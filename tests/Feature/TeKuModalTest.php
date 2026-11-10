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

test('one hundred xp earns 120 TekuPoints that can be exchanged for tenant vouchers', function () {
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
            ->where('metrics.xp', 0)
            ->where('metrics.points_balance', 120)
            ->where('metrics.points_per_reward', 120)
            ->where('rewards.1.can_redeem', true));

    $this->post('/tekumodal/vouchers', ['type' => 'tenant_discount_10'])->assertRedirect('/tekumodal');
    $voucher = TeKuModalVoucher::query()->firstOrFail();
    expect($voucher->type)->toBe('tenant_discount_10')
        ->and($voucher->points_cost)->toBe(120)
        ->and($voucher->discount_percentage)->toBe(10)
        ->and($voucher->max_discount_amount)->toBe(300_000)
        ->and($voucher->status)->toBe('available')
        ->and($voucher->code)->toStartWith('TEKU-');

    $this->get('/tekumodal')->assertInertia(fn ($page) => $page
        ->where('metrics.points_balance', 0)
        ->where('rewards.1.owned_voucher_id', $voucher->id));
    $this->post('/tekumodal/vouchers', ['type' => 'tenant_discount_20'])->assertSessionHasErrors('voucher');
    expect(TeKuModalVoucher::query()->count())->toBe(1);
});

test('first-loan interest voucher is free and applies to the submitted loan', function () {
    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Test User',
        'account_number' => '123456789',
        'bank_name' => 'BCA',
    ]);

    $redeemResponse = $this->actingAs($user)->post('/tekumodal/vouchers', ['type' => 'first_loan_interest']);
    $voucher = TeKuModalVoucher::query()->firstOrFail();
    $redeemResponse->assertRedirect(route('tekumodal.loans.create', ['voucher_id' => $voucher->id]));
    expect($voucher->points_cost)->toBe(0)
        ->and($voucher->interest_rate)->toBe('1.80');

    $this->get("/tekumodal/loans/create?voucher_id={$voucher->id}")
        ->assertInertia(fn ($page) => $page
            ->where('selectedVoucherId', $voucher->id)
            ->has('interestVouchers', 1));

    $this->post('/tekumodal/loans', [
        'principal' => 500_000,
        'term_months' => 3,
        'bank_account_id' => $account->id,
        'tekumodal_voucher_id' => $voucher->id,
    ])->assertRedirect('/tekumodal');

    $loan = LoanApplication::query()->firstOrFail();
    expect($loan->monthly_interest_rate)->toBe('1.80')
        ->and($loan->total_interest)->toBe(27_000);
    expect($voucher->fresh()->status)->toBe('used')
        ->and($voucher->fresh()->loan_application_id)->toBe($loan->id);
});

test('two hundred TekuPoints can redeem and apply the 1.45 percent interest voucher', function () {
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
        'term_months' => 12,
        'monthly_interest_rate' => 1.8,
        'total_interest' => 216_000,
        'total_repayment' => 1_216_000,
        'status' => 'simulation_active',
    ]);
    foreach (range(1, 10) as $number) {
        LoanInstallment::create([
            'loan_application_id' => $loan->id,
            'installment_number' => $number,
            'due_date' => now()->subMonths(10 - $number)->toDateString(),
            'amount' => 101_333,
            'status' => 'paid',
            'paid_at' => now()->subMonths(10 - $number)->subDay(),
        ]);
    }

    $this->actingAs($user)->post('/tekumodal/vouchers', ['type' => 'loan_interest_145'])
        ->assertRedirect('/tekumodal');
    $voucher = TeKuModalVoucher::query()->where('type', 'loan_interest_145')->firstOrFail();
    expect($voucher->points_cost)->toBe(200)
        ->and($voucher->interest_rate)->toBe('1.45');

    $this->post('/tekumodal/loans', [
        'principal' => 500_000,
        'term_months' => 3,
        'bank_account_id' => $account->id,
        'tekumodal_voucher_id' => $voucher->id,
    ])->assertRedirect('/tekumodal');
    $discountedLoan = LoanApplication::query()->latest('id')->firstOrFail();
    expect($discountedLoan->monthly_interest_rate)->toBe('1.45')
        ->and($discountedLoan->total_interest)->toBe(21_750)
        ->and($voucher->fresh()->loan_application_id)->toBe($discountedLoan->id);
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

test('payment result includes the correct billing and gamification summary', function () {
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
        'status' => 'paid',
        'paid_at' => now(),
    ]);
    $payment = LoanPayment::create([
        'loan_installment_id' => $installment->id,
        'order_id' => (string) str()->uuid(),
        'payment_method' => 'qris',
        'amount' => 1_000,
        'status' => 'paid',
        'paid_at' => now(),
    ]);

    $this->actingAs($user)
        ->get("/tekumodal/payments/{$payment->id}/return?from_checkout=1")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tekumodal/payment-result')
            ->where('payment.status', 'paid')
            ->where('payment.due_date', now()->toDateString())
            ->where('summary.period', 'current')
            ->where('summary.available_limit', 99_500_000)
            ->where('summary.xp', 20)
            ->where('summary.previous_xp', 0)
            ->where('summary.scroll_to_constellation', true)
            ->where('summary.animate_constellation', true)
            ->where('summary.paid_installments', 1));

    $this->get("/tekumodal/payments/{$payment->id}/return")
        ->assertInertia(fn ($page) => $page
            ->where('summary.scroll_to_constellation', false)
            ->where('summary.animate_constellation', false));
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
    $gateway->shouldReceive('transactionStatus')
        ->once()
        ->andReturnUsing(fn (string $orderId) => (object) [
            'order_id' => $orderId,
            'gross_amount' => '1000.00',
            'transaction_status' => 'pending',
        ]);
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

    $payment = LoanPayment::query()->firstOrFail();
    expect(session()->get("tekumodal.payment_animation.{$payment->id}"))->toBeTrue();
    expect(LoanPayment::query()->count())->toBe(1)
        ->and($payment->redirect_url)->toBe($checkoutUrl);
});

test('continuing an expired checkout creates a fresh Midtrans transaction', function () {
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
        'due_date' => now()->addMonthNoOverflow()->toDateString(),
        'amount' => 1_000,
    ]);
    $expiredPayment = $installment->payments()->create([
        'order_id' => 'expired-order',
        'payment_method' => 'qris',
        'amount' => $installment->amount,
        'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v4/redirection/expired-token',
        'status' => 'pending',
    ]);
    $checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v4/redirection/fresh-token';
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldReceive('transactionStatus')
        ->once()
        ->with('expired-order')
        ->andReturn((object) [
            'order_id' => 'expired-order',
            'gross_amount' => '1000.00',
            'transaction_status' => 'expire',
            'transaction_id' => 'provider-expired-id',
        ]);
    $gateway->shouldReceive('createRedirectUrl')
        ->once()
        ->andReturn($checkoutUrl);
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->post("/tekumodal/installments/{$installment->id}/payments", ['payment_method' => 'qris'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $checkoutUrl);

    expect($expiredPayment->fresh()->status)->toBe('expire')
        ->and(LoanPayment::query()->count())->toBe(2)
        ->and(LoanPayment::query()->where('status', 'pending')->value('redirect_url'))->toBe($checkoutUrl);
});

test('users can pay a future month installment early', function () {
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
        'installment_number' => 2,
        'due_date' => now()->addMonthNoOverflow()->toDateString(),
        'amount' => 1_000,
    ]);
    $checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v4/redirection/future-installment';
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldReceive('createRedirectUrl')->once()->andReturn($checkoutUrl);
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->get('/tekumodal?period=next')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('period', 'next')
            ->has('installments', 1)
            ->where('installments.0.id', $installment->id)
            ->where('installments.0.number', 2)
            ->where('installments.0.status', 'pending'));

    $this->withHeader('X-Inertia', 'true')
        ->post("/tekumodal/installments/{$installment->id}/payments", ['payment_method' => 'qris'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $checkoutUrl);

    expect(LoanPayment::query()->where('loan_installment_id', $installment->id)->firstOrFail()->status)->toBe('pending');
});

test('dashboard shows the current users unpaid installments due next month', function () {
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
    LoanInstallment::create([
        'loan_application_id' => $loan->id,
        'installment_number' => 1,
        'due_date' => now()->startOfMonth()->addMonthNoOverflow()->addDays(3)->toDateString(),
        'amount' => 125_000,
        'status' => 'pending',
    ]);
    LoanInstallment::create([
        'loan_application_id' => $loan->id,
        'installment_number' => 2,
        'due_date' => now()->startOfMonth()->addMonthNoOverflow()->addDays(8)->toDateString(),
        'amount' => 175_000,
        'status' => 'paid',
        'paid_at' => now(),
    ]);
    LoanInstallment::create([
        'loan_application_id' => $loan->id,
        'installment_number' => 3,
        'due_date' => now()->startOfMonth()->addMonthsNoOverflow(2)->addDays(3)->toDateString(),
        'amount' => 250_000,
        'status' => 'pending',
    ]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('metrics.nextMonthBills', 125_000)
            ->missing('metrics.stockUnits'));
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
