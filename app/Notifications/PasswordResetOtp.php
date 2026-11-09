<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetOtp extends Notification
{
    use Queueable;

    public function __construct(public string $code) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Kode OTP untuk reset password TeKu')
            ->greeting('Permintaan reset password')
            ->line('Gunakan kode OTP berikut untuk mengatur ulang password akun TeKu Anda.')
            ->line($this->code)
            ->line('Kode berlaku selama 10 menit. Jika Anda tidak meminta reset password, abaikan email ini.');
    }
}
