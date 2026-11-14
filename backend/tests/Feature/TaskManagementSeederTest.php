<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\TaskManagementSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TaskManagementSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_seeder_creates_the_documented_local_demo_accounts(): void
    {
        $this->seed(TaskManagementSeeder::class);

        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $member = User::query()->where('email', 'member@example.com')->firstOrFail();

        $this->assertSame(UserRole::Admin, $admin->role);
        $this->assertSame(UserRole::Member, $member->role);
        $this->assertTrue(Hash::check('Taskflow-Local-2026!', $admin->password));
        $this->assertTrue(Hash::check('Taskflow-Local-2026!', $member->password));
    }
}
