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

    public function test_only_admins_and_creators_can_update_or_delete_a_task(): void
    {
        $admin = User::factory()->admin()->create();
        $creator = User::factory()->create();
        $assignee = User::factory()->create();
        $otherMember = User::factory()->create();
        $task = Task::factory()->for($creator, 'creator')->create();
        $task->assignees()->attach($assignee);

        foreach (['update', 'delete'] as $ability) {
            $this->assertTrue($admin->can($ability, $task));
            $this->assertTrue($creator->can($ability, $task));
            $this->assertFalse($assignee->can($ability, $task));
            $this->assertFalse($otherMember->can($ability, $task));
        }

        $this->assertFalse($admin->can('updateStatus', $task));
        $this->assertFalse($creator->can('updateStatus', $task));
        $this->assertFalse($assignee->can('updateStatus', $task));
        $this->assertTrue($assignee->can('submitWork', $task));
        $this->assertFalse($admin->can('submitWork', $task));
        $this->assertFalse($otherMember->can('submitWork', $task));

        $this->assertTrue($admin->can('manageAssignees', $task));
        $this->assertFalse($creator->can('manageAssignees', $task));
        $this->assertFalse($assignee->can('manageAssignees', $task));
        $this->assertFalse($otherMember->can('manageAssignees', $task));
        $this->assertTrue($admin->can('manageTags', $task));
        $this->assertTrue($creator->can('manageTags', $task));
        $this->assertFalse($assignee->can('manageTags', $task));
        $this->assertFalse($otherMember->can('manageTags', $task));
    }

    public function test_authenticated_roles_can_create_tasks(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->assertTrue($admin->can('create', Task::class));
        $this->assertTrue($member->can('create', Task::class));
    }
}
