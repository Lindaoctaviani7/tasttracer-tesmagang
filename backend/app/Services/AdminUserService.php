<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminUserService
{
    public function updateRole(User $user, UserRole $role): ?User
    {
        return DB::transaction(function () use ($user, $role): ?User {
            $administrators = User::query()
                ->where('role', UserRole::Admin)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);
            $targetUser = User::query()
                ->lockForUpdate()
                ->findOrFail($user->getKey());

            if (
                $targetUser->role === UserRole::Admin
                && $role === UserRole::Member
                && $administrators->count() <= 1
            ) {
                return null;
            }

            $targetUser->role = $role;
            $targetUser->save();

            return $targetUser;
        });
    }

    public function delete(User $user): bool
    {
        return DB::transaction(function () use ($user): bool {
            $administrators = User::query()
                ->where('role', UserRole::Admin)
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);
            $targetUser = User::query()
                ->lockForUpdate()
                ->findOrFail($user->getKey());

            if (
                $targetUser->role === UserRole::Admin
                && $administrators->count() <= 1
            ) {
                return false;
            }

            $targetUser->delete();

            return true;
        });
    }
}
