<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\PasswordResetOtp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
            'otpSent' => $request->session()->get('password_reset_otp_sent', false),
        ]);
    }

    /**
     * Send a one-time password reset code to the account email address.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
        ]);
        $request->session()->forget(['password_reset_email', 'password_reset_otp_sent']);
        $identifier = trim($validated['identifier']);
        $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($identifier)])->first()
            : User::query()->where('phone', $identifier)->first();

        if (! $user) {
            return to_route('password.request')->withErrors([
                'identifier' => 'Email/No Telepon tidak terdaftar.',
            ])->withInput();
        }

        $code = (string) random_int(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($code),
                'created_at' => now(),
            ],
        );

        $request->session()->put([
            'password_reset_email' => $user->email,
            'password_reset_otp_sent' => true,
        ]);
        $user->notify(new PasswordResetOtp($code));

        return to_route('password.request')->with('status', 'Kode OTP telah dikirim ke email yang terdaftar.');
    }
}
