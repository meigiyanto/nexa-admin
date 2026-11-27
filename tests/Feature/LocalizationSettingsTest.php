<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalizationSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_can_read_default_localization_preferences(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('localization_preferences.locale', 'en')
            ->assertJsonPath('localization_preferences.timezone', 'Asia/Jakarta')
            ->assertJsonPath('localization_preferences.date_format', 'dmy');
    }

    public function test_user_can_save_localization_preferences(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $preferences = ['locale' => 'id', 'timezone' => 'Asia/Makassar', 'date_format' => 'ymd'];

        $this->actingAs($user)->putJson('/api/settings', [
            'localization_preferences' => $preferences,
        ])->assertOk()->assertJsonPath('localization_preferences.timezone', 'Asia/Makassar');

        $this->assertSame($preferences, $user->fresh()->localization_preferences);
    }

    public function test_invalid_locale_timezone_and_date_format_are_rejected(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)->putJson('/api/settings', [
            'localization_preferences' => [
                'locale' => 'xx',
                'timezone' => 'Mars/Olympus',
                'date_format' => 'invalid',
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'localization_preferences.locale',
            'localization_preferences.timezone',
            'localization_preferences.date_format',
        ]);
    }

    public function test_user_without_settings_update_permission_cannot_change_localization(): void
    {
        $user = User::factory()->create();
        $user->assignRole('viewer');

        $this->actingAs($user)->putJson('/api/settings', [
            'localization_preferences' => [
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
                'date_format' => 'dmy',
            ],
        ])->assertForbidden();
    }

    public function test_updating_localization_does_not_overwrite_notification_preferences(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => [
                'user_activity' => false,
                'access_changes' => true,
                'system_updates' => false,
            ],
        ]);
        $user->assignRole('admin');

        $this->actingAs($user)->putJson('/api/settings', [
            'localization_preferences' => [
                'locale' => 'id',
                'timezone' => 'Asia/Jayapura',
                'date_format' => 'dmy',
            ],
        ])->assertOk();

        $this->assertSame([
            'user_activity' => false,
            'access_changes' => true,
            'system_updates' => false,
        ], $user->fresh()->notification_preferences);
    }

    public function test_guest_cannot_read_localization_settings(): void
    {
        $this->getJson('/api/settings')->assertUnauthorized();
    }
}
