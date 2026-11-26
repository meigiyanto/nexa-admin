<?php

namespace Tests\\Feature;

use App\\Models\\User;
use Database\\Seeders\\PermissionSeeder;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Spatie\\Permission\\Models\\Role;
use Tests\\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_viewer_can_read_users_but_cannot_delete_them(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('viewer');
        $target = User::factory()->create();

        $this->actingAs($viewer)
            ->getJson('/api/users')
            ->assertOk();

        $this->actingAs($viewer)
            ->deleteJson("/api/users/{$target->id}")
            ->assertForbidden();
    }

    public function test_administrator_can_create_a_role_with_granular_permissions(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->postJson('/api/roles', [
                'name' => 'support',
                'permissions' => ['dashboard.view', 'users.view'],
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'support');

        $role = Role::findByName('support', 'web');

        $this->assertTrue($role->hasPermissionTo('dashboard.view'));
        $this->assertFalse($role->hasPermissionTo('users.delete'));
    }

    public function test_administrator_can_assign_multiple_roles_and_direct_permissions(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $target = User::factory()->create();

        $this->actingAs($admin)
            ->putJson("/api/users/{$target->id}/roles", [
                'roles' => ['editor', 'viewer'],
            ])
            ->assertOk()
            ->assertJsonPath('roles', ['editor', 'viewer']);

        $this->actingAs($admin)
            ->putJson("/api/users/{$target->id}/permissions", [
                'permissions' => ['users.delete'],
            ])
            ->assertOk()
            ->assertJsonPath('direct_permissions', ['users.delete']);

        $target->refresh();

        $this->assertTrue($target->hasAllRoles(['editor', 'viewer']));
        $this->assertTrue($target->hasDirectPermission('users.delete'));
        $this->assertTrue($target->hasPermissionTo('users.delete'));
    }

    public function test_editor_cannot_assign_admin_role_without_special_permission(): void
    {
        $editorRole = Role::findByName('editor', 'web');
        $editorRole->givePermissionTo('users.assign-roles');

        $editor = User::factory()->create();
        $editor->assignRole($editorRole);
        $target = User::factory()->create();

        $this->actingAs($editor)
            ->putJson("/api/users/{$target->id}/roles", [
                'roles' => ['admin'],
            ])
            ->assertForbidden();

        $this->assertFalse($target->fresh()->hasRole('admin'));
    }

    public function test_last_active_administrator_cannot_be_deactivated_by_another_user(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($editor)
            ->putJson("/api/users/{$admin->id}", [
                'status' => 'inactive',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The last active administrator cannot be deactivated.');

        $this->assertSame('active', $admin->fresh()->status);
    }

    public function test_user_cannot_change_own_roles_or_direct_permissions(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->putJson("/api/users/{$admin->id}/roles", [
                'roles' => ['viewer'],
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->putJson("/api/users/{$admin->id}/permissions", [
                'permissions' => ['users.delete'],
            ])
            ->assertForbidden();
    }

    public function test_new_user_receives_viewer_role_by_default(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'New Member',
                'email' => 'new-member@example.com',
                'password' => 'password123',
                'status' => 'active',
            ])
            ->assertCreated();

        $userId = $response->json('user.id');

        $this->assertDatabaseHas('model_has_roles', [
            'model_id' => $userId,
            'model_type' => User::class,
            'role_id' => Role::findByName('viewer', 'web')->id,
        ]);
    }
}
