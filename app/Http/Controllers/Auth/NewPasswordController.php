<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class NewPasswordController extends Controller
{
    /**
     * Verify the reset code and set a new password.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $email = $request->session()->get('password_reset_email');
        if (! $email) {
            throw ValidationException::withMessages([
                'otp' => 'Silakan minta kode OTP terlebih dahulu.',
            ]);
        }

        $user = DB::transaction(function () use ($email, $request) {
            $reset = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            if (
                ! $reset
                || ! $reset->created_at
                || Carbon::parse($reset->created_at)->addMinutes(10)->isPast()
                || ! Hash::check($request->string('otp')->toString(), $reset->token)
            ) {
                throw ValidationException::withMessages([
                    'otp' => 'Kode OTP salah atau sudah kedaluwarsa.',
                ]);
            }

            $user = User::query()->where('email', $email)->firstOrFail();
            $user->forceFill([
                'password' => $request->string('password')->toString(),
                'remember_token' => Str::random(60),
            ])->save();

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return $user;
        });

        $request->session()->forget(['password_reset_email', 'password_reset_otp_sent']);
        event(new PasswordReset($user));

        return to_route('password.success');
    }
}
