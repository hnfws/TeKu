<?php

use App\Models\User;

test('email can be updated with the current password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/contact', [
            'email' => 'new@example.com',
            'current_password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($user->refresh()->email)->toBe('new@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('phone can be updated with the current password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/contact', [
            'phone' => '081234567890',
            'current_password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($user->refresh()->phone)->toBe('081234567890');
});

test('account contact information cannot be updated with an incorrect password', function () {
    $user = User::factory()->create();
    $originalEmail = $user->email;

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->patch('/settings/contact', [
            'email' => 'new@example.com',
            'phone' => '081234567890',
            'current_password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect('/settings/password');

    expect($user->refresh()->email)->toBe($originalEmail);
    expect($user->phone)->toBeNull();
});

test('profile email update endpoint does not change account email', function () {
    $user = User::factory()->create();
    $originalEmail = $user->email;

    $this->actingAs($user)->patch('/settings/profile', [
        'name' => $user->name,
        'email' => 'changed@example.com',
        'phone' => '081234567890',
    ])->assertSessionHasNoErrors();

    expect($user->refresh()->email)->toBe($originalEmail);
    expect($user->phone)->toBeNull();
});
