<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventReminderMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public Event $event) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Pengingat event: '.$this->event->title);
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.event-reminder',
            with: [
                'eventUrl' => url('/events/'.$this->event->id),
                'eventDate' => $this->event->start_date
                    ? \Illuminate\Support\Carbon::parse($this->event->start_date, config('app.timezone'))->format('d M Y, H:i')
                    : null,
            ],
        );
    }
}
