<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',

            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'users.assign-roles',
            'users.assign-permissions',
            'users.assign-admin-role',

            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',

            'permissions.view',

            'analytics.view',
            'analytics.export',

            'notifications.view',
            'notifications.manage',

            'activity-logs.view',

            'settings.view',
            'settings.update',

            'profile.view',
            'profile.update',

            'security.update-password',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $allPermissions = Permission::where('guard_name', 'web')->get();

        $admin = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $editor = Role::firstOrCreate([
            'name' => 'editor',
            'guard_name' => 'web',
        ]);

        $viewer = Role::firstOrCreate([
            'name' => 'viewer',
            'guard_name' => 'web',
        ]);

        $admin->syncPermissions($allPermissions);

        $editor->syncPermissions([
            'dashboard.view',
            'users.view',
            'users.create',
            'users.update',
            'analytics.view',
            'notifications.view',
            'activity-logs.view',
            'profile.view',
            'profile.update',
            'security.update-password',
        ]);

        $viewer->syncPermissions([
            'dashboard.view',
            'users.view',
            'analytics.view',
            'notifications.view',
            'profile.view',
            'profile.update',
            'security.update-password',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
