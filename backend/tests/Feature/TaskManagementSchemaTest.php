<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TaskManagementSchemaTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_users_store_the_supported_roles_as_enums(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();

        $this->assertSame(UserRole::Admin, $admin->role);
        $this->assertSame(UserRole::Member, $member->role);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'admin']);
        $this->assertDatabaseHas('users', ['id' => $member->id, 'role' => 'member']);
    }

    public function test_tasks_accept_a_100_character_title_and_allow_nullable_description(): void
    {
        $task = Task::factory()->create([
            'title' => str_repeat('T', 100),
            'description' => null,
        ]);
        $titleColumn = Schema::getColumn('tasks', 'title');
        $descriptionColumn = Schema::getColumn('tasks', 'description');

        $this->assertSame(100, mb_strlen($task->title));
        $this->assertFalse($titleColumn['nullable']);
        $this->assertTrue($descriptionColumn['nullable']);
        $this->assertNull($task->description);
    }

    public function test_task_filters_have_composite_indexes(): void
    {
        $taskIndexes = array_column(Schema::getIndexes('tasks'), 'columns');

        $this->assertContains(['created_by', 'is_completed', 'created_at'], $taskIndexes);
        $this->assertContains(['is_completed', 'created_at'], $taskIndexes);
    }

    public function test_task_completion_is_cast_to_a_boolean_and_defaults_to_false(): void
    {
        $incompleteTask = Task::factory()->create();
        $completedTask = Task::factory()->completed()->create();

        $this->assertSame(false, $incompleteTask->is_completed);
        $this->assertSame(true, $completedTask->is_completed);
    }

    public function test_users_can_access_created_and_assigned_tasks(): void
    {
        $creator = User::factory()->admin()->create();
        $assignee = User::factory()->create();
        $task = Task::factory()->for($creator, 'creator')->create();

        $task->assignees()->attach($assignee);

        $this->assertSame($task->id, $creator->createdTasks()->sole()->id);
        $this->assertTrue($task->creator->is($creator));
        $this->assertSame($task->id, $assignee->assignedTasks()->sole()->id);
        $this->assertTrue($task->assignees->contains($assignee));
        $this->assertNotNull(DB::table('task_user')
            ->where('task_id', $task->id)
            ->where('user_id', $assignee->id)
            ->value('created_at'));
    }

    public function test_tasks_and_tags_have_a_timestamped_many_to_many_relationship(): void
    {
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();

        $task->tags()->attach($tag);

        $this->assertSame($tag->id, $task->tags()->sole()->id);
        $this->assertSame($task->id, $tag->tasks()->sole()->id);
        $this->assertNotNull(DB::table('task_tag')
            ->where('task_id', $task->id)
            ->where('tag_id', $tag->id)
            ->value('created_at'));
    }

    public function test_deleting_a_task_creator_cascades_through_task_pivots(): void
    {
        $creator = User::factory()->create();
        $assignee = User::factory()->create();
        $task = Task::factory()->for($creator, 'creator')->create();
        $tag = Tag::factory()->create();
        $task->assignees()->attach($assignee);
        $task->tags()->attach($tag);

        $taskId = $task->id;
        $creator->delete();

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
        $this->assertDatabaseMissing('task_user', ['task_id' => $taskId]);
        $this->assertDatabaseMissing('task_tag', ['task_id' => $taskId]);
    }

    public function test_deleting_a_tag_cascades_to_its_task_pivot(): void
    {
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();
        $task->tags()->attach($tag);

        $tag->delete();

        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('task_tag', ['task_id' => $task->id, 'tag_id' => $tag->id]);
    }

    public function test_database_rejects_unsupported_user_roles(): void
    {
        $attributes = User::factory()->make()->getAttributes();
        $attributes['role'] = 'owner';
        $attributes['created_at'] = now();
        $attributes['updated_at'] = now();

        $this->expectException(QueryException::class);

        DB::table('users')->insert($attributes);
    }

    public function test_assignee_cannot_be_added_to_a_task_twice(): void
    {
        $task = Task::factory()->create();
        $assignee = User::factory()->create();
        $task->assignees()->attach($assignee);

        $this->expectException(QueryException::class);

        $task->assignees()->attach($assignee);
    }

    public function test_tag_cannot_be_attached_to_a_task_twice(): void
    {
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();
        $task->tags()->attach($tag);

        $this->expectException(QueryException::class);

        $task->tags()->attach($tag);
    }

    public function test_tag_names_must_be_unique(): void
    {
        Tag::factory()->create(['name' => 'planning']);

        $this->expectException(QueryException::class);

        Tag::factory()->create(['name' => 'planning']);
    }

    public function test_database_seeder_creates_a_reusable_task_graph(): void
    {
        $this->seed();
        $this->seed();

        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('tasks', 4);
        $this->assertDatabaseCount('task_user', 8);
        $this->assertDatabaseCount('tags', 3);
        $this->assertDatabaseCount('task_tag', 12);
    }
}
