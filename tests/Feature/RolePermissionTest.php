<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

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

    public function test_login_session_can_be_used_to_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'logout-test@example.com',
            'password' => bcrypt('secret-password'),
        ]);
        $user->assignRole('viewer');

        $this->postJson('/api/login', [
            'email' => 'logout-test@example.com',
            'password' => 'secret-password',
        ])->assertOk();

        $this->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully.');

        $this->assertGuest('web');
    }

    public function test_authenticated_user_endpoint_returns_roles_and_permissions(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('viewer');

        $this->actingAs($viewer)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $viewer->id)
            ->assertJsonPath('roles', ['viewer'])
            ->assertJsonFragment(['dashboard.view']);
    }

    public function test_dashboard_works_without_the_legacy_role_column(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'stats' => ['total_users', 'active_users', 'inactive_users', 'new_users'],
                'chart',
                'recent_users',
            ]);
    }

    public function test_legacy_role_field_is_rejected_by_user_update_api(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $target = User::factory()->create();

        $this->actingAs($admin)
            ->putJson("/api/users/{$target->id}", ['role' => 'admin'])
            ->assertUnprocessable();
    }

    public function test_builtin_role_names_cannot_be_renamed(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $editor = Role::findByName('editor', 'web');

        $this->actingAs($admin)
            ->putJson("/api/roles/{$editor->id}", [
                'name' => 'content-editor',
                'permissions' => ['dashboard.view'],
            ])
            ->assertForbidden();
    }

    public function test_role_manager_cannot_grant_permissions_they_do_not_have(): void
    {
        $editorRole = Role::findByName('editor', 'web');
        $editorRole->givePermissionTo('roles.create');

        $editor = User::factory()->create();
        $editor->assignRole($editorRole);

        $this->actingAs($editor)
            ->postJson('/api/roles', [
                'name' => 'privileged-support',
                'permissions' => ['dashboard.view', 'users.delete'],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('roles', [
            'name' => 'privileged-support',
            'guard_name' => 'web',
        ]);
    }

    public function test_user_access_manager_cannot_grant_permissions_they_do_not_have(): void
    {
        $editorRole = Role::findByName('editor', 'web');
        $editorRole->givePermissionTo('users.assign-permissions');

        $editor = User::factory()->create();
        $editor->assignRole($editorRole);
        $target = User::factory()->create();

        $this->actingAs($editor)
            ->putJson("/api/users/{$target->id}/permissions", [
                'permissions' => ['users.delete'],
            ])
            ->assertForbidden();

        $this->assertFalse($target->fresh()->hasDirectPermission('users.delete'));
    }

    public function test_role_assigner_cannot_assign_a_role_with_higher_permissions(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->postJson('/api/roles', [
                'name' => 'finance-manager',
                'permissions' => ['dashboard.view', 'settings.update'],
            ])
            ->assertCreated();

        $editorRole = Role::findByName('editor', 'web');
        $editorRole->givePermissionTo('users.assign-roles');

        $editor = User::factory()->create();
        $editor->assignRole($editorRole);
        $target = User::factory()->create();

        $this->actingAs($editor)
            ->putJson("/api/users/{$target->id}/roles", [
                'roles' => ['finance-manager'],
            ])
            ->assertForbidden();

        $this->assertFalse($target->fresh()->hasRole('finance-manager'));
    }
}
