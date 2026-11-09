<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated without changing account contact information', function () {
    $user = User::factory()->create();
    $email = $user->email;

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'changed@example.com',
            'business_name' => 'Kedai Test',
            'business_type' => 'Kuliner',
            'address' => 'Jalan Merdeka 10',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe($email);
    expect($user->business_name)->toBe('Kedai Test');
    expect($user->business_type)->toBe('Kuliner');
    expect($user->address)->toBe('Jalan Merdeka 10');
    expect($user->email_verified_at)->not->toBeNull();
});

test('profile fields can be cleared', function () {
    $user = User::factory()->create();
    $user->update([
        'business_name' => 'Kedai Test',
        'business_type' => 'Kuliner',
        'address' => 'Jalan Merdeka 10',
    ]);

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => $user->name,
            'business_name' => null,
            'business_type' => null,
            'address' => null,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->business_name)->toBeNull();
    expect($user->business_type)->toBeNull();
    expect($user->address)->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/settings/profile');

    expect($user->fresh())->not->toBeNull();
});
