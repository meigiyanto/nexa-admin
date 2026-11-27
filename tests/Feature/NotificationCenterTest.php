<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationCenterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_with_notification_permission_can_list_own_notifications(): void
    {
        $user = User::factory()->create();
        $user->assignRole('viewer');
        $user->notify(new \App\Notifications\SystemActivityNotification(
            'Account created', 'A new account was created.', 'user.created', 'System',
        ));

        $this->actingAs($user)->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('data.0.data.title', 'Account created');
    }

    public function test_user_without_notification_permission_cannot_access_notifications(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/notifications')->assertForbidden();
    }

    public function test_user_can_mark_one_and_all_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $user->assignRole('viewer');
        $first = $user->notify(new \App\Notifications\SystemActivityNotification(
            'First', 'First notification.', 'test', 'System',
        ));
        $second = $user->notify(new \App\Notifications\SystemActivityNotification(
            'Second', 'Second notification.', 'test', 'System',
        ));
        $ids = $user->notifications()->latest()->pluck('id');

        $this->actingAs($user)->patchJson("/api/notifications/{$ids[0]}/read")->assertOk();
        $this->assertNotNull($user->notifications()->whereKey($ids[0])->first()->read_at);

        $this->postJson('/api/notifications/read-all')->assertOk();
        $this->assertSame(0, $user->unreadNotifications()->count());
    }

    public function test_user_can_delete_only_their_own_notification(): void
    {
        $owner = User::factory()->create();
        $owner->assignRole('viewer');
        $other = User::factory()->create();
        $other->assignRole('viewer');
        $other->notify(new \App\Notifications\SystemActivityNotification(
            'Private', 'Private notification.', 'test', 'System',
        ));
        $id = $other->notifications()->value('id');

        $this->actingAs($owner)->deleteJson("/api/notifications/{$id}")->assertNotFound();
        $this->assertDatabaseHas('notifications', ['id' => $id]);
    }

    public function test_admin_can_clear_their_own_notification_inbox(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $admin->notify(new \App\Notifications\SystemActivityNotification(
            'First', 'First notification.', 'test', 'System',
        ));

        $this->actingAs($admin)->deleteJson('/api/notifications')->assertOk();
        $this->assertSame(0, $admin->notifications()->count());
    }

    public function test_creating_a_user_notifies_other_active_notification_recipients(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $recipient = User::factory()->create();
        $recipient->assignRole('viewer');

        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'New Member',
            'email' => 'notification-member@example.com',
            'password' => 'password123',
            'status' => 'active',
        ])->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $recipient->id,
            'type' => \App\Notifications\SystemActivityNotification::class,
        ]);
        $this->assertSame(0, $admin->notifications()->count());
    }

    public function test_assigning_roles_notifies_notification_recipients(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $recipient = User::factory()->create();
        $recipient->assignRole('viewer');
        $target = User::factory()->create();

        $this->actingAs($admin)->putJson("/api/users/{$target->id}/roles", [
            'roles' => ['editor'],
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $recipient->id,
            'type' => \App\Notifications\SystemActivityNotification::class,
        ]);
    }
}
