<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()->orderBy('id')->paginate(15);

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

    public function update(
        UpdateUserRequest $request,
        User $user,
        AdminUserService $adminUserService,
    ): JsonResponse {
        $data = $request->validated();

        if (array_key_exists('role', $data)) {
            $updatedUser = $adminUserService->updateRole($user, UserRole::from($data['role']));

            if ($updatedUser === null) {
                return response()->json([
                    'message' => 'The last administrator cannot be demoted.',
                    'data' => null,
                ], 409);
            }

            $user = $updatedUser;
            unset($data['role']);
        }

        if ($data !== []) {
            $user->update($data);
        }

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => ['user' => (new UserResource($user))->resolve()],
        ]);
    }

    public function destroy(User $user, AdminUserService $adminUserService): JsonResponse
    {
        if (! $adminUserService->delete($user)) {
            return response()->json([
                'message' => 'The last administrator cannot be deleted.',
                'data' => null,
            ], 409);
        }

        return response()->json([
            'message' => 'User deleted successfully.',
            'data' => null,
        ]);
    }
}
