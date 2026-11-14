<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssigneeOptionsRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class AssigneeOptionsController extends Controller
{
    public function __invoke(AssigneeOptionsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $users = User::query()
            ->select(['id', 'name', 'email'])
            ->when(
                filled($filters['search'] ?? null),
                fn (Builder $query) => $query->where(function (Builder $query) use ($filters): void {
                    $query->where('name', 'like', '%'.$filters['search'].'%')
                        ->orWhere('email', 'like', '%'.$filters['search'].'%');
                }),
            )
            ->orderBy('name')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 50));

        return response()->json([
            'message' => 'Assignee options retrieved successfully.',
            'data' => [
                'users' => $users->getCollection()->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])->all(),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                ],
            ],
        ]);
    }
}
