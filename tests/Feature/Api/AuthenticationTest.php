<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_rate_limit_is_shared_across_email_case_variations(): void
    {
        $emails = [
            'Admin@example.com',
            'ADMIN@example.com',
            'admin@EXAMPLE.com',
            'ADMIN@EXAMPLE.COM',
            'aDmin@Example.com',
        ];

        foreach ($emails as $email) {
            $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'incorrect-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/login', [
            'email' => 'adMIN@eXAMPLE.com',
            'password' => 'incorrect-password',
        ])->assertTooManyRequests();
    }
}
