<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_user_endpoints_require_authentication(): void
    {
        $user = User::factory()->create();

        $this->getJson('/api/admin/users')->assertUnauthorized();
        $this->getJson("/api/admin/users/{$user->id}")->assertUnauthorized();
        $this->patchJson("/api/admin/users/{$user->id}/role", ['role' => 'admin'])->assertUnauthorized();
    }

    public function test_member_cannot_access_admin_user_endpoints(): void
    {
        $member = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($member);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson("/api/admin/users/{$otherUser->id}")->assertForbidden();
        $this->patchJson("/api/admin/users/{$otherUser->id}/role", ['role' => 'admin'])->assertForbidden();
    }

    public function test_admin_can_search_users_by_name_or_email_and_paginate_results(): void
    {
        $admin = User::factory()->admin()->create();
        $nameMatch = User::factory()->create([
            'name' => 'Searchable Person',
            'email' => 'person@example.test',
        ]);
        $emailMatch = User::factory()->create([
            'name' => 'Another Person',
            'email' => 'searchable@example.test',
        ]);
        User::factory()->create([
            'name' => 'Unrelated Person',
            'email' => 'unrelated@example.test',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?search=searchable&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 1)
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $nameMatch->id]);

        $this->getJson('/api/admin/users?search=searchable&per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonFragment(['id' => $emailMatch->id]);
    }

    public function test_admin_user_search_and_pagination_parameters_are_validated(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?page=0&per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page', 'per_page']);

        $this->getJson('/api/admin/users?search='.str_repeat('a', 256))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('search');
    }

    public function test_admin_can_view_a_user_without_exposing_sensitive_attributes(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token');
    }

    public function test_admin_user_detail_returns_404_for_a_missing_user(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/admin/users/999999')->assertNotFound();
    }

    public function test_admin_can_change_another_users_role(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$member->id}/role", ['role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonMissingPath('data.user.password');

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'role' => 'admin',
        ]);
    }

    public function test_admin_role_change_rejects_unsupported_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$member->id}/role", ['role' => 'owner'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseHas('users', [
            'id' => $member->id,
            'role' => 'member',
        ]);
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$admin->id}/role", ['role' => 'member'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'admin',
        ]);
    }

    public function test_generic_user_update_cannot_bypass_self_role_change_protection(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/users/{$admin->id}", ['role' => 'member'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'admin',
        ]);
    }

    public function test_last_admin_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/users/{$admin->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'The last administrator cannot be deleted.');

        $this->assertModelExists($admin);
    }

    public function test_an_admin_can_be_deleted_when_another_admin_remains(): void
    {
        $admin = User::factory()->admin()->create();
        $otherAdmin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/users/{$otherAdmin->id}")
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->assertModelMissing($otherAdmin);
    }

    public function test_existing_role_update_endpoint_also_protects_the_last_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/users/{$member->id}", ['role' => 'member'])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'member');

        $this->patchJson("/api/users/{$admin->id}", ['role' => 'member'])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'admin',
        ]);
    }

    private function authenticateAs(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
