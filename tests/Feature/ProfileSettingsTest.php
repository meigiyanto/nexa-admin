<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_update_their_name_and_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $this->actingAs($user)->putJson('/api/profile', ['name' => 'Updated Name', 'email' => 'new@example.com'])
            ->assertOk()->assertJsonPath('user.name', 'Updated Name')->assertJsonPath('user.email', 'new@example.com');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name', 'email' => 'new@example.com']);
    }

    public function test_changing_email_resets_email_verification_timestamp(): void
    {
        $user = User::factory()->create(['email' => 'verified@example.com', 'email_verified_at' => now()]);
        $this->actingAs($user)->putJson('/api/profile', ['name' => $user->name, 'email' => 'changed@example.com'])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email_verified_at' => null]);
    }

    public function test_changing_email_sends_a_verification_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'before@example.com']);
        $this->actingAs($user)->putJson('/api/profile', ['name' => $user->name, 'email' => 'after@example.com'])->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_unverified_user_can_request_a_verification_email(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $this->actingAs($user)->postJson('/api/email/verification-notification')->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_unverified_user_cannot_access_protected_application_data(): void
    {
        $user = User::factory()->unverified()->create();
        $this->actingAs($user)->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_signed_verification_link_marks_the_authenticated_users_email_as_verified(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs($user)->getJson($url)->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verification_link_cannot_verify_another_users_email(): void
    {
        $user = User::factory()->unverified()->create();
        $otherUser = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), ['id' => $otherUser->id, 'hash' => sha1($otherUser->email)]);
        $this->actingAs($user)->getJson($url)->assertForbidden();
        $this->assertNull($otherUser->fresh()->email_verified_at);
    }

    public function test_user_cannot_use_another_accounts_email_address(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['email' => 'taken@example.com']);
        $this->actingAs($user)->putJson('/api/profile', ['name' => $user->name, 'email' => 'taken@example.com'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_user_can_upload_and_remove_their_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $response = $this->actingAs($user)->post('/api/profile', [
            'name' => $user->name, 'email' => $user->email, 'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);
        $response->assertOk();
        $path = $user->fresh()->profile_photo_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        $this->actingAs($user)->putJson('/api/profile', [
            'name' => $user->name, 'email' => $user->email, 'remove_photo' => true,
        ])->assertOk();
        $this->assertNull($user->fresh()->profile_photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_profile_photo_must_be_an_allowed_image_under_two_megabytes(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user)->put('/api/profile', [
            'name' => $user->name, 'email' => $user->email,
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');
    }

    public function test_authenticated_user_can_change_password_with_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'old-password', 'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk()->assertJsonPath('message', 'Password changed successfully.');
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_password_change_requires_the_correct_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'wrong-password', 'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_password_change_requires_confirmation_and_minimum_length(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'old-password', 'password' => 'short', 'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
    }

    public function test_guest_cannot_change_password(): void
    {
        $this->putJson('/api/profile/password', [
            'current_password' => 'old-password', 'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertUnauthorized();
    }

    public function test_guest_cannot_update_a_profile(): void
    {
        $this->putJson('/api/profile', ['name' => 'Someone', 'email' => 'someone@example.com'])->assertUnauthorized();
    }
}
