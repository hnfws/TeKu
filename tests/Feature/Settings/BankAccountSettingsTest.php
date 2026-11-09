<?php

use App\Models\BankAccount;
use App\Models\LoanApplication;
use App\Models\User;

test('bank account settings lists only the authenticated users accounts', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Pemilik Akun',
        'account_number' => '1234567890',
        'bank_name' => 'BCA',
    ]);
    BankAccount::create([
        'user_id' => $otherUser->id,
        'account_holder' => 'Pengguna Lain',
        'account_number' => '9876543210',
        'bank_name' => 'BRI',
    ]);

    $this->actingAs($user)->get('/settings/bank-accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/bank-accounts')
            ->has('bankAccounts', 1)
            ->where('bankAccounts.0.id', $account->id)
            ->where('bankAccounts.0.account_number', '1234567890')
            ->has('banks'));
});

test('a bank account can be added from account settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/settings/bank-accounts', [
        'account_holder' => 'Pemilik Akun',
        'account_number' => '1234-5678 90',
        'bank_name' => 'BCA',
        'branch_name' => 'Pusat',
        'city' => 'Jakarta',
    ])->assertRedirect('/settings/bank-accounts')->assertSessionHasNoErrors();

    $account = BankAccount::query()->firstOrFail();
    expect($account->user_id)->toBe($user->id)
        ->and($account->account_number)->toBe('1234567890')
        ->and($account->getRawOriginal('account_number'))->not->toBe('1234567890')
        ->and($account->branch_name)->toBe('Pusat')
        ->and($account->city)->toBe('Jakarta');
});

test('a bank account can be deleted by its owner', function () {
    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Pemilik Akun',
        'account_number' => '1234567890',
        'bank_name' => 'BCA',
    ]);

    $this->actingAs($user)->delete("/settings/bank-accounts/{$account->id}")
        ->assertRedirect('/settings/bank-accounts');

    expect($account->fresh())->toBeNull();
});

test('bank accounts belonging to another user cannot be deleted', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $owner->id,
        'account_holder' => 'Pemilik Akun',
        'account_number' => '1234567890',
        'bank_name' => 'BCA',
    ]);

    $this->actingAs($otherUser)->delete("/settings/bank-accounts/{$account->id}")
        ->assertNotFound();

    expect($account->fresh())->not->toBeNull();
});

test('a bank account used by a loan cannot be deleted', function () {
    $user = User::factory()->create();
    $account = BankAccount::create([
        'user_id' => $user->id,
        'account_holder' => 'Pemilik Akun',
        'account_number' => '1234567890',
        'bank_name' => 'BCA',
    ]);
    LoanApplication::create([
        'user_id' => $user->id,
        'bank_account_id' => $account->id,
        'principal' => 500_000,
        'term_months' => 3,
        'monthly_interest_rate' => 1.8,
        'total_interest' => 27_000,
        'total_repayment' => 527_000,
        'status' => 'simulation_active',
    ]);

    $this->actingAs($user)->delete("/settings/bank-accounts/{$account->id}")
        ->assertSessionHasErrors('bank_account');

    expect($account->fresh())->not->toBeNull();
});
