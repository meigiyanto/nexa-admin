<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_request_a_password_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);

        $response->assertOk()
            ->assertJsonPath('message', 'If an active account exists for that email, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_password_reset_request_does_not_disclose_unknown_or_inactive_accounts(): void
    {
        Notification::fake();
        $inactiveUser = User::factory()->create(['status' => 'inactive']);
        $message = 'If an active account exists for that email, a password reset link has been sent.';

        $this->postJson('/api/forgot-password', ['email' => 'unknown@example.com'])
            ->assertOk()
            ->assertJsonPath('message', $message);

        $this->postJson('/api/forgot-password', ['email' => $inactiveUser->email])
            ->assertOk()
            ->assertJsonPath('message', $message);

        Notification::assertNothingSent();
    }

    public function test_user_can_reset_password_with_a_valid_token(): void
    {
        Notification::fake();
        $user = User::factory()->create(['status' => 'active']);
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $this->assertNotNull($token);
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewSecurePassword123',
            'password_confirmation' => 'NewSecurePassword123',
        ])->assertOk()
            ->assertJsonPath('message', 'Your password has been reset successfully. You can now sign in.');

        $this->assertTrue(Hash::check('NewSecurePassword123', $user->fresh()->password));
        $this->assertNotSame('', $user->fresh()->remember_token);
    }

    public function test_password_reset_rejects_an_invalid_token(): void
    {
        $user = User::factory()->create(['status' => 'active']);

        $this->postJson('/api/reset-password', [
            'token' => Str::random(64),
            'email' => $user->email,
            'password' => 'NewSecurePassword123',
            'password_confirmation' => 'NewSecurePassword123',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
