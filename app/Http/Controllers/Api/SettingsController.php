<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private const DEFAULT_NOTIFICATION_PREFERENCES = [
        'user_activity' => true,
        'access_changes' => true,
        'system_updates' => true,
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'notification_preferences' => array_merge(
                self::DEFAULT_NOTIFICATION_PREFERENCES,
                $request->user('web')->notification_preferences ?? [],
            ),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notification_preferences' => ['required', 'array'],
            'notification_preferences.user_activity' => ['required', 'boolean'],
            'notification_preferences.access_changes' => ['required', 'boolean'],
            'notification_preferences.system_updates' => ['required', 'boolean'],
        ]);

        $preferences = $validated['notification_preferences'];
        $user = $request->user('web');
        $user->forceFill(['notification_preferences' => $preferences])->save();

        return response()->json([
            'message' => 'Notification preferences saved.',
            'notification_preferences' => $preferences,
        ]);
    }
}
