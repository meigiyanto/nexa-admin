<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    private const DEFAULT_NOTIFICATION_PREFERENCES = [
        'user_activity' => true,
        'access_changes' => true,
        'system_updates' => true,
    ];

    private const DEFAULT_LOCALIZATION_PREFERENCES = [
        'locale' => 'en',
        'timezone' => 'Asia/Jakarta',
        'date_format' => 'dmy',
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user('web');

        return response()->json([
            'notification_preferences' => array_merge(
                self::DEFAULT_NOTIFICATION_PREFERENCES,
                $user->notification_preferences ?? [],
            ),
            'localization_preferences' => array_merge(
                self::DEFAULT_LOCALIZATION_PREFERENCES,
                $user->localization_preferences ?? [],
            ),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notification_preferences' => [
                'sometimes',
                'required',
                'array:user_activity,access_changes,system_updates',
            ],
            'notification_preferences.user_activity' => [
                'required_with:notification_preferences',
                'boolean',
            ],
            'notification_preferences.access_changes' => [
                'required_with:notification_preferences',
                'boolean',
            ],
            'notification_preferences.system_updates' => [
                'required_with:notification_preferences',
                'boolean',
            ],
            'localization_preferences' => [
                'sometimes',
                'required',
                'array:locale,timezone,date_format',
            ],
            'localization_preferences.locale' => [
                'required_with:localization_preferences',
                Rule::in(['en', 'id']),
            ],
            'localization_preferences.timezone' => [
                'required_with:localization_preferences',
                'timezone',
            ],
            'localization_preferences.date_format' => [
                'required_with:localization_preferences',
                Rule::in(['dmy', 'mdy', 'ymd']),
            ],
        ]);

        abort_if(
            ! array_key_exists('notification_preferences', $validated) &&
            ! array_key_exists('localization_preferences', $validated),
            422,
            'At least one settings group must be provided.',
        );

        $user = $request->user('web');
        $response = ['message' => 'Settings saved successfully.'];

        if (array_key_exists('notification_preferences', $validated)) {
            $preferences = $validated['notification_preferences'];
            $user->forceFill(['notification_preferences' => $preferences]);
            $response['notification_preferences'] = $preferences;
        }

        if (array_key_exists('localization_preferences', $validated)) {
            $preferences = $validated['localization_preferences'];
            $user->forceFill(['localization_preferences' => $preferences]);
            $response['localization_preferences'] = $preferences;
        }

        $user->save();

        return response()->json($response);
    }
}
