<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class SystemActivityNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $message,
        private readonly string $event,
        private readonly string $actor,
        private readonly ?string $actionUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        $preferences = $notifiable->notification_preferences ?? [];
        $category = $this->category();

        if (($preferences[$category] ?? true) === false) {
            return [];
        }

        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'event' => $this->event,
            'actor' => $this->actor,
            'action_url' => $this->actionUrl,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    private function category(): string
    {
        if (str_contains($this->event, '.roles.') || str_contains($this->event, '.permissions.')) {
            return 'access_changes';
        }

        if (str_starts_with($this->event, 'user.')) {
            return 'user_activity';
        }

        return 'system_updates';
    }
}
