<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUserIndexRequest;
use App\Http\Requests\UpdateUserRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    public function index(AdminUserIndexRequest $request): JsonResponse
    {
        $search = $request->validated('search');
        $users = User::query()
            ->when($search, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->paginate($request->integer('per_page', 10));

        return response()->json([
            'message' => 'Users retrieved successfully.',
            'data' => [
                'users' => UserResource::collection($users->getCollection())->resolve(),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                ],
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'message' => 'User retrieved successfully.',
            'data' => ['user' => (new UserResource($user))->resolve()],
        ]);
    }

    public function updateRole(
        UpdateUserRoleRequest $request,
        User $user,
        AdminUserService $adminUserService,
    ): JsonResponse {
        $updatedUser = $adminUserService->updateRole(
            $user,
            UserRole::from($request->validated('role')),
        );

        if ($updatedUser === null) {
            return response()->json([
                'message' => 'The last administrator cannot be demoted.',
                'data' => null,
            ], 409);
        }

        return response()->json([
            'message' => 'User role updated successfully.',
            'data' => ['user' => (new UserResource($updatedUser))->resolve()],
        ]);
    }
}
