<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        $email = env('BOOTSTRAP_ADMIN_EMAIL');
        $password = env('BOOTSTRAP_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            return;
        }

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => env('BOOTSTRAP_ADMIN_NAME', 'Administrator'),
                'password' => $password,
                'status' => 'active',
            ],
        );

        $admin->syncRoles(['admin']);
    }
}
