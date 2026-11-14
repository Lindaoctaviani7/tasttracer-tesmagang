<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'message' => 'Admin dashboard statistics retrieved successfully.',
            'data' => [
                'total_users' => User::query()->count(),
                'total_tasks' => Task::query()->count(),
                'completed_tasks' => Task::query()->where('is_completed', true)->count(),
                'pending_tasks' => Task::query()->where('is_completed', false)->count(),
            ],
        ]);
    }
}
