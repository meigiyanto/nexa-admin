<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\SystemActivityNotification;
use App\Services\SystemActivityNotifier;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsPreferencesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_can_read_default_notification_preferences(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('notification_preferences.user_activity', true)
            ->assertJsonPath('notification_preferences.access_changes', true)
            ->assertJsonPath('notification_preferences.system_updates', true);
    }

    public function test_user_with_settings_permission_can_update_notification_preferences(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $preferences = [
            'user_activity' => false,
            'access_changes' => true,
            'system_updates' => false,
        ];

        $this->actingAs($user)->putJson('/api/settings', [
            'notification_preferences' => $preferences,
        ])->assertOk()->assertJsonPath('notification_preferences.user_activity', false);

        $this->assertSame($preferences, $user->fresh()->notification_preferences);
    }

    public function test_unknown_notification_preference_keys_are_rejected(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->putJson('/api/settings', [
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => true,
                'admin_override' => true,
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('notification_preferences');

        $this->assertNull($user->fresh()->notification_preferences);
    }

    public function test_unknown_localization_preference_keys_are_rejected(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->putJson('/api/settings', [
            'localization_preferences' => [
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
                'date_format' => 'dmy',
                'debug' => true,
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('localization_preferences');

        $this->assertNull($user->fresh()->localization_preferences);
    }

    public function test_user_without_settings_update_permission_cannot_change_preferences(): void
    {
        $user = User::factory()->create();
        $user->assignRole('viewer');

        $this->actingAs($user)->putJson('/api/settings', [
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => true,
            ],
        ])->assertForbidden();
    }

    public function test_guest_cannot_access_settings_preferences(): void
    {
        $this->getJson('/api/settings')->assertUnauthorized();
    }

    public function test_disabled_notification_category_is_not_delivered(): void
    {
        $actor = User::factory()->create();
        $actor->assignRole('admin');
        $recipient = User::factory()->create([
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => true,
            ],
        ]);
        $recipient->assignRole('viewer');

        app(SystemActivityNotifier::class)->notifyRecipients(
            $actor,
            'New user created',
            'A user was created.',
            'user.created',
        );

        $this->assertSame(0, $recipient->notifications()->count());
    }

    public function test_access_change_notifications_remain_enabled_when_user_activity_is_disabled(): void
    {
        $actor = User::factory()->create();
        $actor->assignRole('admin');
        $recipient = User::factory()->create([
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => true,
            ],
        ]);
        $recipient->assignRole('viewer');

        app(SystemActivityNotifier::class)->notifyRecipients(
            $actor,
            'User roles updated',
            'A user role changed.',
            'user.roles.updated',
        );

        $this->assertSame(1, $recipient->notifications()->count());
    }

    public function test_direct_notification_respects_recipient_preferences(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => true,
            ],
        ]);

        $user->notify(new SystemActivityNotification(
            'User created',
            'A user was created.',
            'user.created',
            'Admin',
        ));

        $this->assertSame(0, $user->notifications()->count());
    }
}
