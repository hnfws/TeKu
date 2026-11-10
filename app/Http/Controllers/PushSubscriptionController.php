<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:4096'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);
        $endpoint = $validated['endpoint'];
        $parts = parse_url($endpoint) ?: [];
        $host = strtolower($parts['host'] ?? '');
        $allowedHosts = [
            'fcm.googleapis.com',
            'push.services.mozilla.com',
            'push.apple.com',
            'notify.windows.com',
            'push.opera.com',
        ];
        $isAllowedHost = in_array($host, $allowedHosts, true)
            || collect($allowedHosts)->contains(fn (string $allowedHost) => str_ends_with($host, '.'.$allowedHost));

        if (($parts['scheme'] ?? null) !== 'https' || ! $isAllowedHost) {
            return response()->json(['message' => 'Unsupported push endpoint.'], 422);
        }

        $endpointHash = hash('sha256', $endpoint);
        $subscription = PushSubscription::query()->where('endpoint_hash', $endpointHash)->first();

        if ($subscription && $subscription->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Endpoint not available.'], 409);
        }

        PushSubscription::updateOrCreate(
            ['endpoint_hash' => $endpointHash],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $endpoint,
                'public_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
            ]
        );

        return response()->json(['message' => 'Pengingat browser berhasil diaktifkan.']);
    }

    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:4096'],
        ]);

        PushSubscription::query()
            ->where('user_id', $request->user()->id)
            ->where('endpoint_hash', hash('sha256', $validated['endpoint']))
            ->delete();

        return response()->json(['message' => 'Pengingat browser berhasil dinonaktifkan.']);
    }
}
