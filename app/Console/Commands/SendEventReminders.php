<?php

namespace App\Console\Commands;

use App\Mail\EventReminderMail;
use App\Models\EventRegistration;
use App\Models\PushSubscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class SendEventReminders extends Command
{
    protected $signature = 'events:send-reminders';

    protected $description = 'Send email and browser reminders 24 hours before registered events';

    public function handle(): int
    {
        $now = now();
        $registrations = EventRegistration::query()
            ->with(['event', 'user'])
            ->where('status', 'registered')
            ->whereHas('event', fn ($query) => $query
                ->whereNotNull('start_date')
                ->where('start_date', '>', $now)
                ->where('start_date', '<=', $now->copy()->addHours(24)))
            ->get();

        foreach ($registrations as $registration) {
            if ($registration->browser_reminded_at === null) {
                $this->sendBrowserReminder($registration);
            }

            if ($registration->email_reminded_at === null) {
                $this->sendEmailReminder($registration);
            }
        }

        return self::SUCCESS;
    }

    private function sendEmailReminder(EventRegistration $registration): void
    {
        $mailer = config('mail.mailers.'.config('mail.default').'.transport');
        if (in_array($mailer, ['log', 'array'], true)) {
            $this->warn('Email belum dikirim; MAIL_MAILER harus memakai layanan email nyata, bukan log/array.');

            return;
        }

        Mail::to($registration->user->email)->send(new EventReminderMail($registration->event));
        $registration->forceFill(['email_reminded_at' => now()])->save();
        $this->info("Email reminder sent for registration {$registration->id}.");
    }

    private function sendBrowserReminder(EventRegistration $registration): void
    {
        $vapid = [
            'subject' => config('services.webpush.subject'),
            'publicKey' => config('services.webpush.public_key'),
            'privateKey' => config('services.webpush.private_key'),
        ];

        if (in_array('', $vapid, true) || in_array(null, $vapid, true)) {
            $this->warn('Browser reminder belum dikirim; konfigurasi VAPID belum lengkap.');

            return;
        }

        $subscriptions = PushSubscription::query()->where('user_id', $registration->user_id)->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $push = new WebPush(['VAPID' => $vapid]);
        $payload = json_encode([
            'title' => 'Pengingat event',
            'body' => $registration->event->title.' dimulai dalam 24 jam.',
            'url' => url('/events/'.$registration->event_id),
        ], JSON_THROW_ON_ERROR);
        $sent = false;

        foreach ($subscriptions as $storedSubscription) {
            $report = $push->sendOneNotification(Subscription::create([
                'endpoint' => $storedSubscription->endpoint,
                'publicKey' => $storedSubscription->public_key,
                'authToken' => $storedSubscription->auth_token,
                'contentEncoding' => 'aes128gcm',
            ]), $payload);

            if ($report->isSuccess()) {
                $sent = true;
                continue;
            }

            if ($report->isSubscriptionExpired()) {
                $storedSubscription->delete();
                continue;
            }

            Log::warning('Event browser reminder delivery failed.', [
                'registration_id' => $registration->id,
                'subscription_id' => $storedSubscription->id,
                'reason' => $report->getReason(),
            ]);
        }

        if ($sent) {
            $registration->forceFill(['browser_reminded_at' => now()])->save();
            $this->info("Browser reminder sent for registration {$registration->id}.");
        }
    }
}
