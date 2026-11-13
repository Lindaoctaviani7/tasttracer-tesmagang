<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function manageAssignees(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function manageTags(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    private function canAccess(User $user, Task $task): bool
    {
        return $user->role === UserRole::Admin
            || $task->created_by === $user->id
            || $task->assignees()->whereKey($user->id)->exists();
    }
}
