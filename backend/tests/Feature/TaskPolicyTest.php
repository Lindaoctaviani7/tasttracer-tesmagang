<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class TaskPolicyTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_authenticated_roles_can_view_the_task_list(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->assertTrue($admin->can('viewAny', Task::class));
        $this->assertTrue($member->can('viewAny', Task::class));
    }

    public function test_only_admins_creators_and_assignees_can_view_a_task(): void
    {
        $admin = User::factory()->admin()->create();
        $creator = User::factory()->create();
        $assignee = User::factory()->create();
        $otherMember = User::factory()->create();
        $task = Task::factory()->for($creator, 'creator')->create();
        $task->assignees()->attach($assignee);

        $this->assertTrue($admin->can('view', $task));
        $this->assertTrue($creator->can('view', $task));
        $this->assertTrue($assignee->can('view', $task));
        $this->assertFalse($otherMember->can('view', $task));
    }

    public function test_only_admins_creators_and_assignees_can_update_and_delete_a_task(): void
    {
        $admin = User::factory()->admin()->create();
        $creator = User::factory()->create();
        $assignee = User::factory()->create();
        $otherMember = User::factory()->create();
        $task = Task::factory()->for($creator, 'creator')->create();
        $task->assignees()->attach($assignee);

        foreach (['update', 'delete', 'manageAssignees'] as $ability) {
            $this->assertTrue($admin->can($ability, $task));
            $this->assertTrue($creator->can($ability, $task));
            $this->assertTrue($assignee->can($ability, $task));
            $this->assertFalse($otherMember->can($ability, $task));
        }
    }

    public function test_authenticated_roles_can_create_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->assertTrue($admin->can('create', Task::class));
        $this->assertTrue($member->can('create', Task::class));
    }
}
