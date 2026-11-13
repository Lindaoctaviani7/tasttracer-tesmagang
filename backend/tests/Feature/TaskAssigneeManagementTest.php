<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskAssigneeManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_can_list_assignees_for_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();
        $task->assignees()->attach($assignee);

        $this->authenticateAs($admin)->getJson("/api/tasks/{$task->id}/assignees")
            ->assertOk()
            ->assertJsonPath('data.assignees.0.id', $assignee->id)
            ->assertJsonPath('data.assignees.0.name', $assignee->name)
            ->assertJsonPath('data.assignees.0.email', $assignee->email)
            ->assertJsonPath('data.assignees.0.role', 'member')
            ->assertJsonMissingPath('data.assignees.0.password');
    }

    public function test_member_can_list_assignees_for_a_task_they_are_assigned_to(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $otherAssignee = User::factory()->create();
        $task->assignees()->attach([$member->id, $otherAssignee->id]);

        $this->authenticateAs($member)->getJson("/api/tasks/{$task->id}/assignees")
            ->assertOk()
            ->assertJsonCount(2, 'data.assignees')
            ->assertJsonFragment(['id' => $member->id, 'email' => $member->email])
            ->assertJsonFragment(['id' => $otherAssignee->id, 'email' => $otherAssignee->email]);
    }

    public function test_admin_can_add_a_single_assignee_to_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data.assignees')
            ->assertJsonPath('data.assignees.0.id', $assignee->id);

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);
    }

    public function test_member_can_add_multiple_assignees_to_a_task_they_created(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create();
        $assignees = User::factory()->count(2)->create();

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => $assignees->modelKeys(),
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data.assignees')
            ->assertJsonFragment(['id' => $assignees[0]->id])
            ->assertJsonFragment(['id' => $assignees[1]->id]);

        $this->assertDatabaseCount('task_user', 2);
    }

    public function test_adding_an_existing_assignee_does_not_create_a_duplicate(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();
        $task->assignees()->attach($assignee);

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data.assignees');

        $this->assertDatabaseCount('task_user', 1);
    }

    public function test_add_assignees_rejects_duplicate_ids_in_one_request(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id, $assignee->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_ids.1');

        $this->assertDatabaseCount('task_user', 0);
    }

    public function test_add_assignees_rejects_unknown_user_ids_without_writing_any_relations(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $existingAssignee = User::factory()->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$existingAssignee->id, 999999],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_ids.1');

        $this->assertDatabaseCount('task_user', 0);
    }

    public function test_add_assignees_rejects_an_empty_id_list(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_ids');

        $this->assertDatabaseCount('task_user', 0);
    }

    public function test_admin_can_remove_an_assignee_from_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();
        $task->assignees()->attach($assignee);

        $this->authenticateAs($admin)->deleteJson("/api/tasks/{$task->id}/assignees/{$assignee->id}")
            ->assertOk()
            ->assertJsonPath('data.assignee.id', $assignee->id)
            ->assertJsonPath('data.assignee.email', $assignee->email);

        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);
    }

    public function test_member_can_remove_an_assignee_from_a_task_they_are_assigned_to(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $assigneeToRemove = User::factory()->create();
        $task->assignees()->attach([$member->id, $assigneeToRemove->id]);

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$task->id}/assignees/{$assigneeToRemove->id}")
            ->assertOk()
            ->assertJsonPath('data.assignee.id', $assigneeToRemove->id);

        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $assigneeToRemove->id,
        ]);
        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_member_cannot_list_add_or_remove_assignees_on_an_unrelated_task(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();
        $task->assignees()->attach($assignee);

        $this->authenticateAs($member)->getJson("/api/tasks/{$task->id}/assignees")
            ->assertForbidden();

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$member->id],
        ])->assertForbidden();

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$task->id}/assignees/{$assignee->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);
        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_assignee_endpoints_return_404_for_missing_tasks_or_unassigned_users(): void
    {
        $admin = User::factory()->admin()->create();
        $assignee = User::factory()->create();
        $task = Task::factory()->create();

        $this->authenticateAs($admin)->getJson('/api/tasks/999999/assignees')
            ->assertNotFound();

        $this->authenticateAs($admin)->deleteJson("/api/tasks/{$task->id}/assignees/{$assignee->id}")
            ->assertNotFound();
    }

    public function test_assignee_endpoints_return_401_without_authentication(): void
    {
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->getJson("/api/tasks/{$task->id}/assignees")->assertUnauthorized();

        $this->withToken('invalid-token')->postJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id],
        ])->assertUnauthorized();

        $this->assertDatabaseCount('task_user', 0);
    }

    private function authenticateAs(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
