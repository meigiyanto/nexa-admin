<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecuritySettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_enable_two_factor_authentication_after_confirming_an_authenticator_code(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);

        $setup = $this->actingAs($user)->postJson('/api/security/two-factor/setup', [
            'current_password' => 'current-password',
        ])->assertOk()->assertJsonStructure(['secret', 'otpauth_url']);

        $secret = $setup->json('secret');
        $response = $this->postJson('/api/security/two-factor/enable', [
            'code' => $this->totpCode($secret),
        ])->assertOk()->assertJsonCount(10, 'recovery_codes');

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
        $this->assertSame($secret, $user->fresh()->two_factor_secret);
        $this->assertCount(10, $user->fresh()->two_factor_recovery_codes);
        $this->assertNotSame($response->json('recovery_codes.0'), $user->fresh()->two_factor_recovery_codes[0]);
    }

    public function test_two_factor_login_requires_a_valid_authenticator_code(): void
    {
        $user = $this->twoFactorUser();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'current-password',
        ])->assertOk()->assertJsonPath('requires_two_factor', true);

        $this->postJson('/api/login/two-factor', ['code' => '000000'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->postJson('/api/login/two-factor', ['code' => $this->totpCode($user->two_factor_secret)])
            ->assertOk()
            ->assertJsonPath('user.two_factor_enabled', true);
    }

    public function test_totp_code_can_only_be_used_once_for_login(): void
    {
        $user = $this->twoFactorUser();
        $code = $this->totpCode($user->two_factor_secret);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'current-password',
        ])->assertOk()->assertJsonPath('requires_two_factor', true);

        $this->postJson('/api/login/two-factor', ['code' => $code])->assertOk();
        $this->postJson('/api/logout')->assertOk();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'current-password',
        ])->assertOk()->assertJsonPath('requires_two_factor', true);

        $this->postJson('/api/login/two-factor', ['code' => $code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_recovery_code_can_only_be_used_once_for_login(): void
    {
        $user = $this->twoFactorUser();
        $recoveryCode = 'ABCD1234-EFGH5678';
        $user->forceFill(['two_factor_recovery_codes' => [Hash::make($recoveryCode)]])->save();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'current-password'])
            ->assertJsonPath('requires_two_factor', true);
        $this->postJson('/api/login/two-factor', ['code' => $recoveryCode])->assertOk();
        $this->postJson('/api/logout')->assertOk();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'current-password'])
            ->assertJsonPath('requires_two_factor', true);
        $this->postJson('/api/login/two-factor', ['code' => $recoveryCode])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_inactive_user_cannot_complete_a_two_factor_login(): void
    {
        $user = $this->twoFactorUser(['status' => 'inactive']);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'current-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_user_can_revoke_other_database_sessions_after_password_confirmation(): void
    {
        config(['session.driver' => 'database']);
        $user = User::factory()->create(['password' => 'current-password']);
        DB::table('sessions')->insert([
            'id' => 'another-device-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.2',
            'user_agent' => 'Test browser',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($user)->postJson('/api/security/sessions/revoke-others', [
            'current_password' => 'current-password',
        ])->assertOk()->assertJsonPath('revoked', 1);

        $this->assertDatabaseMissing('sessions', ['id' => 'another-device-session']);
    }

    public function test_two_factor_login_challenge_is_rate_limited_per_account(): void
    {
        $user = $this->twoFactorUser();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'current-password',
        ])->assertOk()->assertJsonPath('requires_two_factor', true);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login/two-factor', ['code' => '000000'])->assertUnprocessable();
        }

        $this->postJson('/api/login/two-factor', ['code' => '000000'])->assertTooManyRequests();
    }

    public function test_pending_two_factor_setup_expires_after_ten_minutes(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);

        $setup = $this->actingAs($user)->postJson('/api/security/two-factor/setup', [
            'current_password' => 'current-password',
        ])->assertOk()->assertJsonPath('expires_in_minutes', 10);

        $this->travel(11)->minutes();

        $this->postJson('/api/security/two-factor/enable', [
            'code' => $this->totpCode($setup->json('secret')),
        ])->assertUnprocessable();

        $this->assertNull($user->fresh()->two_factor_confirmed_at);
        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_user_can_disable_two_factor_after_password_and_code_confirmation(): void
    {
        $user = $this->twoFactorUser();

        $this->actingAs($user)->deleteJson('/api/security/two-factor', [
            'current_password' => 'current-password',
            'code' => $this->totpCode($user->two_factor_secret),
        ])->assertOk();

        $this->assertNull($user->fresh()->two_factor_confirmed_at);
        $this->assertNull($user->fresh()->two_factor_secret);
        $this->assertNull($user->fresh()->two_factor_recovery_codes);
    }

    public function test_user_can_regenerate_recovery_codes_after_password_and_totp_confirmation(): void
    {
        $user = $this->twoFactorUser();
        $oldCodes = $user->two_factor_recovery_codes;

        $response = $this->actingAs($user)->postJson('/api/security/two-factor/recovery-codes', [
            'current_password' => 'current-password',
            'code' => $this->totpCode($user->two_factor_secret),
        ])->assertOk()->assertJsonCount(10, 'recovery_codes');

        $this->assertNotSame($oldCodes, $user->fresh()->two_factor_recovery_codes);
        $this->assertNotSame($response->json('recovery_codes.0'), $user->fresh()->two_factor_recovery_codes[0]);
    }

    private function twoFactorUser(array $attributes = []): User
    {
        $secret = app(TwoFactorService::class)->generateSecret();
        $user = User::factory()->create(array_merge([
            'password' => 'current-password',
            'status' => 'active',
        ], $attributes));
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => [Hash::make('ABCD1234-EFGH5678')],
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $user->fresh();
    }

    private function totpCode(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';

        foreach (str_split($secret) as $character) {
            $bits .= str_pad(decbin(strpos($alphabet, $character)), 5, '0', STR_PAD_LEFT);
        }

        $key = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $key .= chr(bindec($chunk));
            }
        }

        $counter = intdiv(time(), 30);
        $message = pack('N2', 0, $counter);
        $hash = hash_hmac('sha1', $message, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $binary = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($binary % 1000000), 6, '0', STR_PAD_LEFT);
    }
}
