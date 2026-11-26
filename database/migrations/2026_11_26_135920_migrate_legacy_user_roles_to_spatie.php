<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            return;
        }

        DB::transaction(function () {
            $users = DB::table('users')->select('id', 'role')->get();

            foreach ($users as $user) {
                $roleName = $user->role ?: 'viewer';

                $roleId = DB::table('roles')
                    ->where('name', $roleName)
                    ->where('guard_name', 'web')
                    ->value('id');

                if (! $roleId) {
                    $roleId = DB::table('roles')->insertGetId([
                        'name' => $roleName,
                        'guard_name' => 'web',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                DB::table('model_has_roles')->insertOrIgnore([
                    'role_id' => $roleId,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $user->id,
                ]);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('role')->default('viewer');
            });
        }

        if (! Schema::hasTable('model_has_roles')) {
            return;
        }

        $users = DB::table('users')->select('id')->get();

        foreach ($users as $user) {
            $role = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_id', $user->id)
                ->where('model_has_roles.model_type', 'App\\Models\\User')
                ->where('roles.guard_name', 'web')
                ->value('roles.name');

            if ($role) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['role' => $role]);
            }
        }
    }
};
