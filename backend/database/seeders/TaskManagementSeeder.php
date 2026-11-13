<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskManagementSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.test'],
            User::factory()->admin()->make([
                'name' => 'Task Admin',
                'email' => 'admin@example.test',
                'role' => UserRole::Admin->value,
            ])->getAttributes(),
        );

        $members = collect([
            ['name' => 'Task Member One', 'email' => 'member.one@example.test'],
            ['name' => 'Task Member Two', 'email' => 'member.two@example.test'],
        ])->map(fn (array $attributes): User => User::query()->firstOrCreate(
            ['email' => $attributes['email']],
            User::factory()->make($attributes)->getAttributes(),
        ));

        $tags = collect(['planning', 'urgent', 'documentation'])
            ->map(fn (string $name): Tag => Tag::query()->firstOrCreate(
                ['name' => $name],
            ));

        foreach ([
            'Prepare quarterly plan',
            'Review project priorities',
            'Document team workflow',
            'Coordinate weekly review',
        ] as $title) {
            $task = Task::query()->firstOrCreate(
                ['title' => $title, 'created_by' => $admin->id],
                Task::factory()->for($admin, 'creator')->make([
                    'title' => $title,
                ])->getAttributes(),
            );

            $task->assignees()->syncWithoutDetaching($members->pluck('id')->all());
            $task->tags()->syncWithoutDetaching($tags->pluck('id')->all());
        }
    }
}
