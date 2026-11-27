<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_update_their_name_and_email(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)->putJson('/api/profile', [
            'name' => 'Updated Name',
            'email' => 'new@example.com',
        ])->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', 'new@example.com');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'new@example.com',
        ]);
    }

    public function test_changing_email_resets_email_verification_timestamp(): void
    {
        $user = User::factory()->create([
            'email' => 'verified@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)->putJson('/api/profile', [
            'name' => $user->name,
            'email' => 'changed@example.com',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_verified_at' => null,
        ]);
    }

    public function test_user_cannot_use_another_accounts_email_address(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($user)->putJson('/api/profile', [
            'name' => $user->name,
            'email' => 'taken@example.com',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_user_can_upload_and_remove_their_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/api/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertOk();
        $path = $user->fresh()->profile_photo_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $this->actingAs($user)->putJson('/api/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'remove_photo' => true,
        ])->assertOk();

        $this->assertNull($user->fresh()->profile_photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_profile_photo_must_be_an_allowed_image_under_two_megabytes(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->put('/api/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');
    }

    public function test_guest_cannot_update_a_profile(): void
    {
        $this->putJson('/api/profile', [
            'name' => 'Someone',
            'email' => 'someone@example.com',
        ])->assertUnauthorized();
    }
}
