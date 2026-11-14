<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssigneeOptionsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_authenticated_user_can_search_and_paginate_assignee_options(): void
    {
        User::factory()->create(['name' => 'Available One', 'email' => 'one@example.test']);
        User::factory()->create(['name' => 'Available Two', 'email' => 'two@example.test']);
        User::factory()->create(['name' => 'Other Person', 'email' => 'other@example.test']);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/users/assignee-options?search=available&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 1)
            ->assertJsonStructure([
                'data' => [
                    'users' => [['id', 'name', 'email']],
                    'pagination' => ['current_page', 'per_page', 'total', 'last_page'],
                ],
            ]);
    }

    public function test_assignee_options_require_authentication(): void
    {
        $this->getJson('/api/users/assignee-options')->assertUnauthorized();
    }

    public function test_assignee_options_reject_invalid_pagination_and_search_values(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/users/assignee-options?page=0&per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['page', 'per_page']);
        $this->getJson('/api/users/assignee-options?search='.str_repeat('a', 256))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('search');
    }
}
