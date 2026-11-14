<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_task_endpoints_return_401_without_authentication(): void
    {
        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->withToken('invalid-token')->getJson('/api/tasks')->assertUnauthorized();
        $this->patchJson('/api/tasks/1/status', ['is_completed' => true])->assertUnauthorized();
        $this->patchJson('/api/tasks/1/submission', [
            'status' => 'completed',
            'submission' => 'No access.',
        ])->assertUnauthorized();
    }

    public function test_member_sees_only_tasks_they_created_or_are_assigned_to(): void
    {
        $member = User::factory()->create();
        $createdTask = Task::factory()->for($member, 'creator')->create();
        $assignedTask = Task::factory()->create();
        $assignedTask->assignees()->attach($member);
        $unrelatedTask = Task::factory()->create();

        $this->authenticateAs($member)->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $createdTask->id])
            ->assertJsonFragment(['id' => $assignedTask->id])
            ->assertJsonMissing(['id' => $unrelatedTask->id]);
    }

    public function test_admin_sees_all_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        Task::factory()->count(3)->create();

        $this->authenticateAs($admin)->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 3);
    }

    public function test_task_list_is_paginated_and_sorted_by_newest(): void
    {
        $admin = User::factory()->admin()->create();
        $tasks = collect(range(0, 15))
            ->map(fn (int $minutesAgo): Task => Task::factory()->create([
                'created_at' => now()->subMinutes($minutesAgo),
            ]));

        $firstPage = $this->authenticateAs($admin)->getJson('/api/tasks');

        $firstPage->assertOk()
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 10)
            ->assertJsonPath('data.pagination.total', 16)
            ->assertJsonPath('data.tasks.0.id', $tasks->first()->id);

        $this->authenticateAs($admin)->getJson('/api/tasks?page=2')
            ->assertOk()
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.total', 16)
            ->assertJsonPath('data.tasks.0.id', $tasks[10]->id);
    }

    public function test_admin_can_view_any_task_directly(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();

        $this->authenticateAs($admin)->getJson("/api/tasks/{$task->id}")
            ->assertOk()
            ->assertJsonPath('data.task.id', $task->id);
    }

    public function test_member_can_create_a_task_owned_by_the_authenticated_user(): void
    {
        $member = User::factory()->create();

        $this->authenticateAs($member)->postJson('/api/tasks', [
            'title' => 'Prepare sprint plan',
            'description' => 'Collect priorities for the next sprint.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.task.title', 'Prepare sprint plan')
            ->assertJsonPath('data.task.created_by', $member->id);

        $this->assertDatabaseHas('tasks', [
            'title' => 'Prepare sprint plan',
            'created_by' => $member->id,
            'is_completed' => false,
        ]);
    }

    public function test_task_creation_rejects_an_empty_title(): void
    {
        $member = User::factory()->create();

        $this->authenticateAs($member)->postJson('/api/tasks', ['title' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title')
            ->assertJsonPath('errors.title.0', 'The title field is required.');

        $this->assertDatabaseMissing('tasks', ['created_by' => $member->id]);
    }

    public function test_admin_can_create_a_task(): void
    {
        $admin = User::factory()->admin()->create();

        $this->authenticateAs($admin)->postJson('/api/tasks', [
            'title' => str_repeat('T', 100),
            'is_completed' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.task.title', str_repeat('T', 100))
            ->assertJsonPath('data.task.is_completed', true)
            ->assertJsonPath('data.task.created_by', $admin->id);

        $this->assertDatabaseHas('tasks', [
            'title' => str_repeat('T', 100),
            'created_by' => $admin->id,
            'is_completed' => true,
        ]);
    }

    public function test_member_cannot_create_a_task_for_another_user(): void
    {
        $member = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->authenticateAs($member)->postJson('/api/tasks', [
            'title' => 'Spoofed task',
            'created_by' => $otherUser->id,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('created_by');

        $this->assertDatabaseMissing('tasks', ['title' => 'Spoofed task']);
    }

    public function test_task_creation_rejects_titles_longer_than_100_characters(): void
    {
        $member = User::factory()->create();

        $this->authenticateAs($member)->postJson('/api/tasks', [
            'title' => str_repeat('T', 101),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title')
            ->assertJsonPath('errors.title.0', 'The title field must not be greater than 100 characters.');
    }

    public function test_task_creation_rejects_invalid_optional_fields(): void
    {
        $member = User::factory()->create();

        $this->authenticateAs($member)->postJson('/api/tasks', [
            'title' => 'Valid title',
            'description' => 42,
            'is_completed' => 'finished',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['description', 'is_completed'])
            ->assertJsonPath('errors.description.0', 'The description field must be a string.')
            ->assertJsonPath('errors.is_completed.0', 'The is completed field must be true or false.');

        $this->assertDatabaseMissing('tasks', ['title' => 'Valid title']);
    }

    public function test_member_can_update_own_task_and_submit_assigned_task_work(): void
    {
        $member = User::factory()->create();
        $createdTask = Task::factory()->for($member, 'creator')->create();
        $assignedTask = Task::factory()->create();
        $assignedTask->assignees()->attach($member);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$createdTask->id}", [
            'title' => 'Updated created task',
        ])->assertOk()
            ->assertJsonPath('data.task.title', 'Updated created task');

        $this->authenticateAs($member)->patchJson("/api/tasks/{$assignedTask->id}/submission", [
            'status' => 'completed',
            'submission' => 'Completed the requested report.',
        ])->assertOk()
            ->assertJsonPath('data.task.is_completed', true)
            ->assertJsonPath('data.task.my_assignment.status', 'completed')
            ->assertJsonPath('data.task.my_assignment.submission', 'Completed the requested report.');

        $admin = User::factory()->admin()->create();
        $this->authenticateAs($admin)->getJson("/api/tasks/{$assignedTask->id}")
            ->assertOk()
            ->assertJsonPath('data.task.is_completed', true);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$assignedTask->id}/submission", [
            'status' => 'in_progress',
            'submission' => 'Still working.',
        ])->assertOk()
            ->assertJsonPath('data.task.my_assignment.status', 'in_progress')
            ->assertJsonPath('data.task.is_completed', false);

        $this->assertDatabaseHas('tasks', [
            'id' => $createdTask->id,
            'title' => 'Updated created task',
        ]);
        $this->assertDatabaseHas('tasks', [
            'id' => $assignedTask->id,
            'is_completed' => false,
        ]);
        $this->assertDatabaseHas('task_user', [
            'task_id' => $assignedTask->id,
            'user_id' => $member->id,
            'status' => 'in_progress',
            'submission' => 'Still working.',
        ]);

        $this->authenticateAs($member)->putJson("/api/tasks/{$assignedTask->id}", [
            'title' => 'Attempted assigned task edit',
        ])->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => $assignedTask->id,
            'title' => $assignedTask->title,
        ]);
    }

    public function test_member_can_replace_task_fields_with_put(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create([
            'title' => 'Old title',
            'description' => 'Old description',
            'is_completed' => false,
        ]);

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}", [
            'title' => 'Replacement title',
            'description' => 'Replacement description',
        ])
            ->assertOk()
            ->assertJsonPath('data.task.title', 'Replacement title')
            ->assertJsonPath('data.task.description', 'Replacement description')
            ->assertJsonPath('data.task.is_completed', false);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Replacement title',
            'description' => 'Replacement description',
            'is_completed' => false,
            'created_by' => $member->id,
        ]);
    }

    public function test_updating_one_task_status_does_not_change_other_tasks(): void
    {
        $member = User::factory()->create();
        $taskToComplete = Task::factory()->for($member, 'creator')->create([
            'title' => 'Finish selected task',
            'is_completed' => false,
        ]);
        $otherTask = Task::factory()->for($member, 'creator')->create([
            'title' => 'Keep other task pending',
            'is_completed' => false,
        ]);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$taskToComplete->id}/status", [
            'is_completed' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.task.id', $taskToComplete->id)
            ->assertJsonPath('data.task.is_completed', true);

        $this->assertDatabaseHas('tasks', [
            'id' => $taskToComplete->id,
            'is_completed' => true,
        ]);
        $this->assertDatabaseHas('tasks', [
            'id' => $otherTask->id,
            'is_completed' => false,
        ]);
    }

    public function test_put_rejects_an_empty_task_title(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create([
            'title' => 'Keep this title',
        ]);

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}", [
            'title' => '',
            'description' => null,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title')
            ->assertJsonPath('errors.title.0', 'The title field is required.');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Keep this title',
        ]);
    }

    public function test_task_endpoints_return_404_for_a_missing_task(): void
    {
        $admin = User::factory()->admin()->create();

        $this->authenticateAs($admin)->getJson('/api/tasks/999999')
            ->assertNotFound();

        $this->authenticateAs($admin)->putJson('/api/tasks/999999', [
            'title' => 'Missing task',
        ])->assertNotFound();

        $this->authenticateAs($admin)->deleteJson('/api/tasks/999999')
            ->assertNotFound();
    }

    public function test_member_cannot_update_or_delete_an_unrelated_task(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create(['title' => 'Protected task']);

        $this->authenticateAs($member)->getJson("/api/tasks/{$task->id}")
            ->assertForbidden();

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}", [
            'title' => 'Unauthorized update',
        ])->assertForbidden();

        $this->authenticateAs($member)->patchJson("/api/tasks/{$task->id}/status", [
            'is_completed' => true,
        ])->assertForbidden();

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$task->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Protected task',
        ]);
    }

    public function test_member_can_delete_a_task_they_created_but_not_one_they_are_assigned_to(): void
    {
        $member = User::factory()->create();
        $createdTask = Task::factory()->for($member, 'creator')->create();
        $assignedTask = Task::factory()->create();
        $assignedTask->assignees()->attach($member);

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$createdTask->id}")
            ->assertOk();
        $this->authenticateAs($member)->deleteJson("/api/tasks/{$assignedTask->id}")
            ->assertForbidden();

        $this->assertDatabaseMissing('tasks', ['id' => $createdTask->id]);
        $this->assertDatabaseHas('tasks', ['id' => $assignedTask->id]);
    }

    public function test_task_details_cannot_be_updated_with_a_status_field(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create([
            'is_completed' => false,
        ]);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$task->id}", [
            'is_completed' => true,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_completed')
            ->assertJsonPath('errors.is_completed.0', 'The is completed field is prohibited.');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'is_completed' => false,
        ]);
    }

    public function test_task_status_rejects_values_that_are_not_boolean(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create([
            'is_completed' => false,
        ]);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$task->id}/status", [
            'is_completed' => 'finished',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_completed')
            ->assertJsonPath('errors.is_completed.0', 'The is completed field must be true or false.');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'is_completed' => false,
        ]);
    }

    public function test_each_assignee_has_an_independent_status_and_admin_can_see_submissions(): void
    {
        $admin = User::factory()->admin()->create();
        $firstMember = User::factory()->create();
        $secondMember = User::factory()->create();
        $task = Task::factory()->for($admin, 'creator')->create();
        $task->assignees()->attach([$firstMember->id, $secondMember->id]);

        $this->authenticateAs($firstMember)->patchJson("/api/tasks/{$task->id}/submission", [
            'status' => 'completed',
            'submission' => 'First member result.',
        ])->assertOk()
            ->assertJsonPath('data.task.is_completed', false)
            ->assertJsonPath('data.task.my_assignment.status', 'completed');

        $this->authenticateAs($firstMember)->getJson('/api/tasks?status=completed')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1);
        $this->authenticateAs($secondMember)->getJson('/api/tasks?status=pending')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1);

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $firstMember->id,
            'status' => 'completed',
            'submission' => 'First member result.',
        ]);
        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $secondMember->id,
            'status' => 'in_progress',
            'submission' => null,
        ]);

        $this->authenticateAs($secondMember)->getJson("/api/tasks/{$task->id}")
            ->assertOk()
            ->assertJsonPath('data.task.assignees.0.status', null)
            ->assertJsonPath('data.task.assignees.0.submission', null);

        $this->authenticateAs($admin)->getJson("/api/tasks/{$task->id}")
            ->assertOk()
            ->assertJsonFragment([
                'id' => $firstMember->id,
                'name' => $firstMember->name,
                'status' => 'completed',
                'submission' => 'First member result.',
            ])
            ->assertJsonFragment([
                'id' => $secondMember->id,
                'name' => $secondMember->name,
                'status' => 'in_progress',
                'submission' => null,
            ]);

        $this->authenticateAs($secondMember)->patchJson("/api/tasks/{$task->id}/submission", [
            'status' => 'completed',
            'submission' => 'Second member result.',
        ])->assertOk()
            ->assertJsonPath('data.task.is_completed', true);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'is_completed' => true,
        ]);
    }

    public function test_assignee_must_submit_a_result_before_marking_work_completed(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $task->assignees()->attach($member);

        $this->authenticateAs($member)->patchJson("/api/tasks/{$task->id}/submission", [
            'status' => 'completed',
            'submission' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('submission');

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $member->id,
            'status' => 'in_progress',
            'submission' => null,
        ]);
    }

    public function test_admin_cannot_submit_work_as_a_member(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->for($admin, 'creator')->create();
        $member = User::factory()->create();
        $task->assignees()->attach($member);

        $this->authenticateAs($admin)->patchJson("/api/tasks/{$task->id}/submission", [
            'status' => 'completed',
            'submission' => 'Admin should not submit for member.',
        ])->assertForbidden();

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $member->id,
            'status' => 'in_progress',
            'submission' => null,
        ]);
    }

    public function test_admin_can_update_and_delete_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $taskId = $task->id;

        $this->authenticateAs($admin)->patchJson("/api/tasks/{$taskId}", [
            'title' => 'Admin updated task',
        ])->assertOk();

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'title' => 'Admin updated task',
        ]);

        $this->authenticateAs($admin)->deleteJson("/api/tasks/{$taskId}")
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
    }

    public function test_member_cannot_change_a_task_creator_through_update(): void
    {
        $member = User::factory()->create();
        $otherUser = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create();

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}", [
            'created_by' => $otherUser->id,
            'title' => 'Attempted ownership update',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('created_by');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'created_by' => $member->id,
        ]);
    }

    public function test_member_gets_403_when_managing_assignees_on_an_accessible_task(): void
    {
        $member = User::factory()->create();
        $newAssignee = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create();

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$newAssignee->id],
        ])
            ->assertForbidden();

        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $newAssignee->id,
        ]);
    }

    public function test_admin_can_add_and_remove_assignees_from_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->authenticateAs($admin)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id],
        ])->assertOk();

        $this->assertDatabaseHas('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);

        $this->authenticateAs($admin)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [],
        ])->assertOk()
            ->assertJsonPath('data.assignees', []);

        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);
    }

    public function test_member_cannot_manage_assignees_on_an_unrelated_task(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->authenticateAs($member)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [$assignee->id],
        ])->assertForbidden();

        $this->assertDatabaseMissing('task_user', [
            'task_id' => $task->id,
            'user_id' => $assignee->id,
        ]);
    }

    public function test_assignee_management_rejects_unknown_user_ids(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();

        $this->authenticateAs($admin)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => [999999],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_ids.0');

        $this->assertDatabaseCount('task_user', 0);
    }

    public function test_assignee_management_requires_a_list_of_user_ids(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $assignee = User::factory()->create();

        $this->authenticateAs($admin)->putJson("/api/tasks/{$task->id}/assignees", [
            'user_ids' => ['assignee' => $assignee->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_ids');

        $this->assertDatabaseCount('task_user', 0);
    }

    public function test_admin_can_list_users_and_change_a_user_role(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->authenticateAs($admin)->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $member->id, 'email' => $member->email]);

        $this->authenticateAs($admin)->patchJson("/api/users/{$member->id}", [
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonMissingPath('data.user.password');

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'role' => 'admin',
        ]);
    }

    public function test_member_cannot_access_user_management_or_change_a_role(): void
    {
        $member = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->authenticateAs($member)->getJson('/api/users')->assertForbidden();
        $this->authenticateAs($member)->patchJson("/api/users/{$otherUser->id}", [
            'role' => 'admin',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $otherUser->id,
            'role' => 'member',
        ]);
    }

    public function test_admin_user_updates_reject_unsupported_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->authenticateAs($admin)->patchJson("/api/users/{$member->id}", [
            'role' => 'owner',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'role' => 'member',
        ]);
    }

    public function test_admin_can_delete_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        $memberId = $member->id;

        $this->authenticateAs($admin)->deleteJson("/api/users/{$memberId}")
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->assertDatabaseMissing('users', ['id' => $memberId]);
    }

    private function authenticateAs(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
