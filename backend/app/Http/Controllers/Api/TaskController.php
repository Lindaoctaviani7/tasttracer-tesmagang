<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\AddTaskAssigneesRequest;
use App\Http\Requests\ManageTaskAssigneesRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Http\Resources\UserResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Task::class);

        $user = $request->user();
        $query = Task::query()->with(['creator:id,name', 'assignees:id,name']);

        if ($user->role !== UserRole::Admin) {
            $query->where(function (Builder $query) use ($user): void {
                $query->where('created_by', $user->id)
                    ->orWhereHas('assignees', fn (Builder $assignees) => $assignees->whereKey($user->id));
            });
        }

        $tasks = $query->orderByDesc('created_at')->orderByDesc('id')->paginate(15);

        return response()->json([
            'message' => 'Tasks retrieved successfully.',
            'data' => [
                'tasks' => TaskResource::collection($tasks->getCollection())->resolve(),
                'pagination' => [
                    'current_page' => $tasks->currentPage(),
                    'per_page' => $tasks->perPage(),
                    'total' => $tasks->total(),
                    'last_page' => $tasks->lastPage(),
                ],
            ],
        ]);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        Gate::authorize('create', Task::class);

        $task = Task::query()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);
        $task->load(['creator:id,name', 'assignees:id,name']);

        return response()->json([
            'message' => 'Task created successfully.',
            'data' => ['task' => (new TaskResource($task))->resolve()],
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $task->load(['creator:id,name', 'assignees:id,name']);

        return response()->json([
            'message' => 'Task retrieved successfully.',
            'data' => ['task' => (new TaskResource($task))->resolve()],
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);
        $task->update($request->validated());
        $task->load(['creator:id,name', 'assignees:id,name']);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => ['task' => (new TaskResource($task))->resolve()],
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);
        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
            'data' => null,
        ]);
    }

    public function updateAssignees(ManageTaskAssigneesRequest $request, Task $task): JsonResponse
    {
        Gate::authorize('manageAssignees', $task);

        DB::transaction(fn () => $task->assignees()->sync($request->validated('user_ids')));
        $task->load('assignees:id,name');

        return response()->json([
            'message' => 'Task assignees updated successfully.',
            'data' => [
                'assignees' => $task->assignees->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->all(),
            ],
        ]);
    }

    public function indexAssignees(Task $task): JsonResponse
    {
        Gate::authorize('manageAssignees', $task);
        $task->load('assignees:id,name,email,role,created_at');

        return response()->json([
            'message' => 'Task assignees retrieved successfully.',
            'data' => [
                'assignees' => UserResource::collection($task->assignees)->resolve(),
            ],
        ]);
    }

    public function storeAssignees(AddTaskAssigneesRequest $request, Task $task): JsonResponse
    {
        Gate::authorize('manageAssignees', $task);

        $task->assignees()->syncWithoutDetachingOrFail($request->validated('user_ids'));
        $task->load('assignees:id,name,email,role,created_at');

        return response()->json([
            'message' => 'Task assignees added successfully.',
            'data' => [
                'assignees' => UserResource::collection($task->assignees)->resolve(),
            ],
        ]);
    }

    public function destroyAssignee(Task $task, int $userId): JsonResponse
    {
        Gate::authorize('manageAssignees', $task);

        $assignee = $task->assignees()->whereKey($userId)->firstOrFail();
        $task->assignees()->detachOrFail($assignee);

        return response()->json([
            'message' => 'Task assignee removed successfully.',
            'data' => [
                'assignee' => (new UserResource($assignee))->resolve(),
            ],
        ]);
    }
}
