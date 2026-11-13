<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TagManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_can_create_and_list_tags(): void
    {
        $admin = User::factory()->admin()->create();

        $this->authenticateAs($admin)->postJson('/api/tags', ['name' => 'Planning'])
            ->assertCreated()
            ->assertJsonPath('data.tag.name', 'Planning');

        $this->assertDatabaseHas('tags', ['name' => 'Planning']);

        $this->authenticateAs($admin)->getJson('/api/tags')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.tags.0.name', 'Planning');
    }

    public function test_admin_can_update_a_tag_name(): void
    {
        $admin = User::factory()->admin()->create();
        $tag = Tag::factory()->create(['name' => 'Old label']);

        $this->authenticateAs($admin)->putJson("/api/tags/{$tag->id}", ['name' => 'New label'])
            ->assertOk()
            ->assertJsonPath('data.tag.name', 'New label');

        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'New label']);
        $this->assertDatabaseMissing('tags', ['name' => 'Old label']);
    }

    public function test_admin_can_delete_a_tag_and_its_task_relations(): void
    {
        $admin = User::factory()->admin()->create();
        $tag = Tag::factory()->create();
        $task = Task::factory()->create();
        $task->tags()->attach($tag);

        $this->authenticateAs($admin)->deleteJson("/api/tags/{$tag->id}")
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->assertDatabaseMissing('tags', ['id' => $tag->id]);
        $this->assertDatabaseMissing('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tag->id,
        ]);
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
    }

    public function test_tag_names_are_required_and_unique(): void
    {
        $admin = User::factory()->admin()->create();
        Tag::factory()->create(['name' => 'planning']);

        $this->authenticateAs($admin)->postJson('/api/tags', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name')
            ->assertJsonPath('errors.name.0', 'The name field is required.');

        $this->authenticateAs($admin)->postJson('/api/tags', ['name' => 'planning'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertDatabaseCount('tags', 1);
    }

    public function test_tag_name_must_be_unique_when_updated(): void
    {
        $admin = User::factory()->admin()->create();
        $firstTag = Tag::factory()->create(['name' => 'planning']);
        $secondTag = Tag::factory()->create(['name' => 'delivery']);

        $this->authenticateAs($admin)->putJson("/api/tags/{$secondTag->id}", [
            'name' => 'planning',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertDatabaseHas('tags', ['id' => $firstTag->id, 'name' => 'planning']);
        $this->assertDatabaseHas('tags', ['id' => $secondTag->id, 'name' => 'delivery']);
    }

    public function test_admin_can_attach_one_or_multiple_tags_to_any_task(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $tags = Tag::factory()->count(2)->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tags[0]->id],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data.tags')
            ->assertJsonPath('data.tags.0.id', $tags[0]->id);

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tags[1]->id],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data.tags');

        $this->assertDatabaseCount('task_tag', 2);
    }

    public function test_member_can_attach_and_remove_tags_from_a_task_they_can_manage(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create();
        $tags = Tag::factory()->count(2)->create();

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tags[0]->id, $tags[1]->id],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'data.tags');

        $this->assertDatabaseHas('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tags[0]->id,
        ]);
        $this->assertDatabaseHas('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tags[1]->id,
        ]);

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$task->id}/tags/{$tags[0]->id}")
            ->assertOk()
            ->assertJsonPath('data.tag.id', $tags[0]->id);

        $this->assertDatabaseMissing('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tags[0]->id,
        ]);
        $this->assertDatabaseHas('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tags[1]->id,
        ]);
    }

    public function test_member_can_manage_tags_on_a_task_assigned_to_them(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $task->assignees()->attach($member);
        $tag = Tag::factory()->create();

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tag->id],
        ])->assertOk();

        $this->assertDatabaseHas('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tag->id,
        ]);
    }

    public function test_member_can_list_tags_but_cannot_manage_master_tags(): void
    {
        $member = User::factory()->create();
        $tag = Tag::factory()->create(['name' => 'existing']);

        $this->authenticateAs($member)->getJson('/api/tags')
            ->assertOk()
            ->assertJsonPath('data.tags.0.name', 'existing');
        $this->authenticateAs($member)->postJson('/api/tags', ['name' => 'new'])
            ->assertForbidden();
        $this->authenticateAs($member)->putJson("/api/tags/{$tag->id}", ['name' => 'changed'])
            ->assertForbidden();
        $this->authenticateAs($member)->deleteJson("/api/tags/{$tag->id}")
            ->assertForbidden();

        $this->assertDatabaseCount('tags', 1);
        $this->assertDatabaseHas('tags', ['id' => $tag->id, 'name' => 'existing']);
    }

    public function test_member_cannot_attach_or_remove_tags_from_an_unrelated_task(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();
        $task->tags()->attach($tag);

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tag->id],
        ])->assertForbidden();

        $this->authenticateAs($member)->deleteJson("/api/tasks/{$task->id}/tags/{$tag->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('task_tag', [
            'task_id' => $task->id,
            'tag_id' => $tag->id,
        ]);
    }

    public function test_tag_attachment_rejects_unknown_and_duplicate_ids(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [999999],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('tag_ids.0');

        $this->authenticateAs($admin)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tag->id, $tag->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('tag_ids.1');

        $this->assertDatabaseCount('task_tag', 0);
    }

    public function test_readding_an_attached_tag_does_not_create_a_duplicate(): void
    {
        $member = User::factory()->create();
        $task = Task::factory()->for($member, 'creator')->create();
        $tag = Tag::factory()->create();
        $task->tags()->attach($tag);

        $this->authenticateAs($member)->postJson("/api/tasks/{$task->id}/tags", [
            'tag_ids' => [$tag->id],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data.tags');

        $this->assertDatabaseCount('task_tag', 1);
    }

    public function test_tag_endpoints_return_404_for_missing_records(): void
    {
        $admin = User::factory()->admin()->create();
        $task = Task::factory()->create();
        $tag = Tag::factory()->create();

        $this->authenticateAs($admin)->putJson('/api/tags/999999', ['name' => 'Unknown'])
            ->assertNotFound();

        $this->authenticateAs($admin)->deleteJson('/api/tags/999999')
            ->assertNotFound();

        $this->authenticateAs($admin)->postJson('/api/tasks/999999/tags', [
            'tag_ids' => [$tag->id],
        ])->assertNotFound();

        $this->authenticateAs($admin)->deleteJson("/api/tasks/{$task->id}/tags/{$tag->id}")
            ->assertNotFound();
    }

    private function authenticateAs(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
