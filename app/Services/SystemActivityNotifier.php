<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\SystemActivityNotification;
use Illuminate\Support\Facades\Notification;

class SystemActivityNotifier
{
    public function notifyAdmins(
        User $actor,
        string $title,
        string $message,
        string $event,
        ?string $actionUrl = null,
    ): void {
        $recipients = User::permission('notifications.view')
            ->where('status', 'active')
            ->where('id', '!=', $actor->getKey())
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send(
            $recipients,
            new SystemActivityNotification($title, $message, $event, $actor->name, $actionUrl),
        );
    }
}
