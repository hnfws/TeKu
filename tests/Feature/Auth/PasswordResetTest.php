<?php

use App\Models\User;
use App\Notifications\PasswordResetOtp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

test('forgot password screen can be rendered', function () {
    $this->get('/forgot-password')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/forgot-password')
            ->where('otpSent', false));
});

test('authenticated users can use the forgot password flow from settings', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get('/forgot-password')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/forgot-password'));

    $this->post('/forgot-password', ['identifier' => $user->email])
        ->assertRedirect('/forgot-password')
        ->assertSessionHas('password_reset_otp_sent', true);

    $notification = Notification::sent($user, PasswordResetOtp::class)->first();
    expect($notification)->toBeInstanceOf(PasswordResetOtp::class);

    $this->post('/reset-password', [
        'otp' => $notification->code,
        'password' => 'New-password-123',
        'password_confirmation' => 'New-password-123',
    ])->assertRedirect(route('password.success'));

    expect(Hash::check('New-password-123', $user->fresh()->password))->toBeTrue();
});

test('registered email receives a password reset otp', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->post('/forgot-password', ['identifier' => $user->email])
        ->assertRedirect('/forgot-password')
        ->assertSessionHas('status', 'Kode OTP telah dikirim ke email yang terdaftar.')
        ->assertSessionHas('password_reset_otp_sent', true);

    Notification::assertSentTo($user, PasswordResetOtp::class);
    expect(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeTrue();
});

test('registered phone receives the otp at the account email', function () {
    Notification::fake();
    $user = User::factory()->create(['phone' => '081234567890']);

    $this->post('/forgot-password', ['identifier' => $user->phone])
        ->assertRedirect('/forgot-password')
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($user, PasswordResetOtp::class);
    expect(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeTrue();
});

test('unregistered email or phone displays an account not found error', function () {
    Notification::fake();

    $this->from('/forgot-password')->post('/forgot-password', [
        'identifier' => 'not-registered@example.com',
    ])->assertRedirect('/forgot-password')
        ->assertSessionHasErrors([
            'identifier' => 'Email/No Telepon tidak terdaftar.',
        ]);

    Notification::assertNothingSent();
});

test('password can be reset with a valid otp and otp cannot be reused', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->post('/forgot-password', ['identifier' => $user->email]);
    $notification = Notification::sent($user, PasswordResetOtp::class)->first();

    expect($notification)->toBeInstanceOf(PasswordResetOtp::class);

    $this->post('/reset-password', [
        'otp' => $notification->code,
        'password' => 'New-password-123',
        'password_confirmation' => 'New-password-123',
    ])->assertSessionHasNoErrors()
        ->assertRedirect(route('password.success'));

    expect(Hash::check('New-password-123', $user->fresh()->password))->toBeTrue()
        ->and(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeFalse();

    $this->withSession(['password_reset_email' => $user->email])->post('/reset-password', [
        'otp' => $notification->code,
        'password' => 'Another-password-123',
        'password_confirmation' => 'Another-password-123',
    ])->assertSessionHasErrors('otp');
});

test('incorrect and expired password reset otp are rejected', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['identifier' => $user->email]);
    $notification = Notification::sent($user, PasswordResetOtp::class)->first();

    $this->post('/reset-password', [
        'otp' => '000000',
        'password' => 'New-password-123',
        'password_confirmation' => 'New-password-123',
    ])->assertSessionHasErrors('otp');

    DB::table('password_reset_tokens')->where('email', $user->email)->update([
        'created_at' => now()->subMinutes(11),
    ]);

    $this->post('/reset-password', [
        'otp' => $notification->code,
        'password' => 'New-password-123',
        'password_confirmation' => 'New-password-123',
    ])->assertSessionHasErrors('otp');

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});
