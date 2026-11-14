<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use LogicException;

class TaskManagementSeeder extends Seeder
{
    private const DEMO_PASSWORD = 'Taskflow-Local-2026!';

    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new LogicException('Task management demo data can only be seeded in local or testing environments.');
        }

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Task Admin',
                'password' => self::DEMO_PASSWORD,
                'role' => UserRole::Admin,
            ],
        );

        $members = collect([
            ['name' => 'Task Member', 'email' => 'member@example.com'],
            ['name' => 'Task Member Two', 'email' => 'member.two@example.test'],
        ])->map(fn (array $attributes): User => User::query()->updateOrCreate(
            ['email' => $attributes['email']],
            [
                ...$attributes,
                'password' => self::DEMO_PASSWORD,
                'role' => UserRole::Member,
            ],
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
