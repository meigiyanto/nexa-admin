<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_login_session_cookie_authenticates_analytics_requests(): void
    {
        $user = User::factory()->create([
            'email' => 'analytics-session@example.com',
            'password' => bcrypt('secret-password'),
        ]);
        $user->givePermissionTo('analytics.view');

        $this->postJson('/api/login', [
            'email' => 'analytics-session@example.com',
            'password' => 'secret-password',
        ])->assertOk()
            ->assertCookie(config('session.cookie'));

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'analytics-session@example.com');

        $this->getJson('/api/analytics?start_date=2026-11-01&end_date=2026-11-02')
            ->assertOk()
            ->assertJsonStructure(['filters', 'summary', 'registrations']);
    }

    public function test_user_with_analytics_view_permission_can_view_date_filtered_report(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('analytics.view');
        User::factory()->create(['created_at' => '2026-11-01 10:00:00', 'status' => 'active']);
        User::factory()->create(['created_at' => '2026-11-02 10:00:00', 'status' => 'inactive']);
        User::factory()->create(['created_at' => '2026-10-31 10:00:00', 'status' => 'active']);

        $this->actingAs($viewer)
            ->getJson('/api/analytics?start_date=2026-11-01&end_date=2026-11-02')
            ->assertOk()
            ->assertJsonPath('summary.total_users', 2)
            ->assertJsonPath('summary.active_users', 1)
            ->assertJsonPath('summary.inactive_users', 1)
            ->assertJsonPath('registrations.0.date', '2026-11-01')
            ->assertJsonPath('registrations.0.users', 1)
            ->assertJsonPath('registrations.1.users', 1);
    }

    public function test_user_without_analytics_view_permission_cannot_view_report(): void
    {
        $viewer = User::factory()->create();

        $this->actingAs($viewer)
            ->getJson('/api/analytics?start_date=2026-11-01&end_date=2026-11-02')
            ->assertForbidden();
    }

    public function test_analytics_date_range_is_required_and_validated(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('analytics.view');

        $this->actingAs($viewer)->getJson('/api/analytics')->assertUnprocessable()
            ->assertJsonValidationErrors(['start_date', 'end_date']);
        $this->actingAs($viewer)
            ->getJson('/api/analytics?start_date=2026-11-03&end_date=2026-11-02')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_analytics_date_range_cannot_exceed_366_days(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('analytics.view');

        $this->actingAs($viewer)
            ->getJson('/api/analytics?start_date=2025-01-01&end_date=2026-01-02')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The selected date range cannot exceed 366 days.');
    }

    public function test_user_with_analytics_export_permission_can_download_csv(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('analytics.export');

        $this->actingAs($viewer)
            ->get('/api/analytics/export?start_date=2026-11-01&end_date=2026-11-30')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8')
            ->assertHeader('content-disposition');
    }

    public function test_user_without_analytics_export_permission_cannot_download_csv(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('analytics.view');

        $this->actingAs($viewer)
            ->getJson('/api/analytics/export?start_date=2026-11-01&end_date=2026-11-30')
            ->assertForbidden();
    }
}
