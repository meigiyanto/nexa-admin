<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Alex Morgan',
                'password' => 'password',
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $users = [
            ['Jamie Chen', 'jamie@example.com', 'editor', 'active'],
            ['Taylor Smith', 'taylor@example.com', 'viewer', 'active'],
            ['Jordan Lee', 'jordan@example.com', 'editor', 'active'],
            ['Morgan Diaz', 'morgan@example.com', 'viewer', 'inactive'],
            ['Casey Brown', 'casey@example.com', 'viewer', 'active'],
        ];

        foreach ($users as [$name, $email, $role, $status]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => 'password',
                    'role' => $role,
                    'status' => $status,
                ]
            );
        }
    }
}
