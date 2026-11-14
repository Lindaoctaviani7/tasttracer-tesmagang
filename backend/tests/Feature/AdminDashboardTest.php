<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_receives_global_dashboard_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        Task::factory()->for($member, 'creator')->create(['is_completed' => true]);
        Task::factory()->count(2)->for($admin, 'creator')->create(['is_completed' => false]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard/stats')
            ->assertOk()
            ->assertExactJson([
                'message' => 'Admin dashboard statistics retrieved successfully.',
                'data' => [
                    'total_users' => 2,
                    'total_tasks' => 3,
                    'completed_tasks' => 1,
                    'pending_tasks' => 2,
                ],
            ]);
    }

    public function test_member_cannot_access_admin_dashboard_statistics(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/dashboard/stats')->assertForbidden();
    }

    public function test_admin_dashboard_statistics_require_authentication(): void
    {
        $this->getJson('/api/admin/dashboard/stats')->assertUnauthorized();
    }
}
