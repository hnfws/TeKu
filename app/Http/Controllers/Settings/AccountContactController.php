<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountContactController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => [
                'sometimes',
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($request->user()->id),
            ],
            'phone' => ['sometimes', 'required', 'string', 'max:30'],
            'current_password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if (array_key_exists('email', $validated) && $user->email !== $validated['email']) {
            $user->email = $validated['email'];
            $user->email_verified_at = null;
        }

        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
        }

        $user->save();

        return back();
    }
}
