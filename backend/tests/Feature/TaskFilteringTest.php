<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskFilteringTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_can_filter_all_tasks_by_completed_status(): void
    {
        $admin = User::factory()->admin()->create();
        $completedTask = Task::factory()->completed()->create(['title' => 'Completed by another user']);
        Task::factory()->create(['title' => 'Pending task']);

        $this->authenticateAs($admin)->getJson('/api/tasks?status=completed')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.tasks.0.id', $completedTask->id)
            ->assertJsonPath('data.tasks.0.is_completed', true);
    }

    public function test_admin_can_filter_all_tasks_by_pending_status(): void
    {
        $admin = User::factory()->admin()->create();
        $pendingTask = Task::factory()->create(['title' => 'Pending by another user']);
        Task::factory()->completed()->create(['title' => 'Completed task']);

        $this->authenticateAs($admin)->getJson('/api/tasks?status=pending')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.tasks.0.id', $pendingTask->id)
            ->assertJsonPath('data.tasks.0.is_completed', false);
    }

    public function test_member_status_filters_only_include_created_or_assigned_tasks(): void
    {
        $member = User::factory()->create();
        $createdCompleted = Task::factory()->for($member, 'creator')->completed()->create();
        $assignedCompleted = Task::factory()->completed()->create();
        $assignedCompleted->assignees()->attach($member, ['status' => 'completed']);
        $createdPending = Task::factory()->for($member, 'creator')->create();
        $unrelatedCompleted = Task::factory()->completed()->create();
        $unrelatedPending = Task::factory()->create();

        $completed = $this->authenticateAs($member)->getJson('/api/tasks?status=completed');
        $completed->assertOk()
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $createdCompleted->id])
            ->assertJsonFragment(['id' => $assignedCompleted->id])
            ->assertJsonMissing(['id' => $unrelatedCompleted->id]);

        $pending = $this->authenticateAs($member)->getJson('/api/tasks?status=pending');
        $pending->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.tasks.0.id', $createdPending->id)
            ->assertJsonMissing(['id' => $unrelatedPending->id]);
    }

    public function test_admin_search_matches_task_titles_across_all_users(): void
    {
        $admin = User::factory()->admin()->create();
        $matchingTask = Task::factory()->create(['title' => 'Quarterly review preparation']);
        Task::factory()->create(['title' => 'Prepare a project plan']);

        $this->authenticateAs($admin)->getJson('/api/tasks?search=review')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.tasks.0.id', $matchingTask->id);
    }

    public function test_member_search_only_matches_accessible_task_titles(): void
    {
        $member = User::factory()->create();
        $createdMatch = Task::factory()->for($member, 'creator')->create([
            'title' => 'Review the draft',
        ]);
        $assignedMatch = Task::factory()->create(['title' => 'Review assigned work']);
        $assignedMatch->assignees()->attach($member, ['status' => 'completed']);
        Task::factory()->create(['title' => 'Review another member task']);
        Task::factory()->for($member, 'creator')->create(['title' => 'Finish unrelated report']);

        $this->authenticateAs($member)->getJson('/api/tasks?search=Review')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $createdMatch->id])
            ->assertJsonFragment(['id' => $assignedMatch->id]);
    }

    public function test_status_search_and_pagination_are_combined_in_the_database_query(): void
    {
        $admin = User::factory()->admin()->create();
        $matchingTasks = collect(range(1, 5))
            ->map(fn (int $number): Task => Task::factory()->completed()->create([
                'title' => "Review item {$number}",
            ]));
        Task::factory()->completed()->create(['title' => 'Planning item']);
        Task::factory()->create(['title' => 'Review pending item']);

        $this->authenticateAs($admin)->getJson('/api/tasks?status=completed&search=Review&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.per_page', 2)
            ->assertJsonPath('data.pagination.total', 5)
            ->assertJsonPath('data.tasks.0.id', $matchingTasks[2]->id)
            ->assertJsonPath('data.tasks.1.id', $matchingTasks[1]->id);
    }

    public function test_member_combined_filters_and_pagination_keep_the_access_scope(): void
    {
        $this->travelTo('2026-01-01 12:00:00');
        $member = User::factory()->create();
        $createdMatches = collect(range(1, 2))
            ->map(fn (int $number): Task => Task::factory()->for($member, 'creator')->completed()->create([
                'title' => "Review owned item {$number}",
                'created_at' => now()->addMinutes($number),
            ]));
        $assignedMatch = Task::factory()->completed()->create([
            'title' => 'Review assigned item',
            'created_at' => now()->addMinutes(3),
        ]);
        $assignedMatch->assignees()->attach($member, ['status' => 'completed']);
        Task::factory()->for($member, 'creator')->create(['title' => 'Review pending item']);
        Task::factory()->completed()->create(['title' => 'Review unrelated item']);

        $this->authenticateAs($member)->getJson('/api/tasks?status=completed&search=Review&page=2&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.per_page', 1)
            ->assertJsonPath('data.pagination.total', 3)
            ->assertJsonPath('data.tasks.0.id', $createdMatches[1]->id);
    }

    public function test_task_list_defaults_to_ten_results_per_page(): void
    {
        $admin = User::factory()->admin()->create();
        Task::factory()->count(12)->create();

        $this->authenticateAs($admin)->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonPath('data.pagination.per_page', 10)
            ->assertJsonPath('data.pagination.total', 12)
            ->assertJsonCount(10, 'data.tasks');
    }

    public function test_task_list_rejects_invalid_query_parameters(): void
    {
        $admin = User::factory()->admin()->create();

        $this->authenticateAs($admin)->getJson('/api/tasks?status=done&search[]=invalid&page=0&per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'search', 'page', 'per_page']);
    }

    private function authenticateAs(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
