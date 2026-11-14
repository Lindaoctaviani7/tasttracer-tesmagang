<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AssigneeOptionsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/users/assignee-options', AssigneeOptionsController::class);

    Route::patch('/tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::apiResource('tasks', TaskController::class);
    Route::get('/tasks/{task}/assignees', [TaskController::class, 'indexAssignees']);
    Route::post('/tasks/{task}/assignees', [TaskController::class, 'storeAssignees']);
    Route::delete('/tasks/{task}/assignees/{userId}', [TaskController::class, 'destroyAssignee']);
    Route::put('/tasks/{task}/assignees', [TaskController::class, 'updateAssignees']);
    Route::post('/tasks/{task}/tags', [TaskController::class, 'storeTags']);
    Route::delete('/tasks/{task}/tags/{tagId}', [TaskController::class, 'destroyTag']);
    Route::get('/tags', [TagController::class, 'index']);

    Route::middleware('role:admin')->group(function (): void {
        Route::get('/admin/dashboard/stats', AdminDashboardController::class);
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::get('/admin/users/{user}', [AdminUserController::class, 'show']);
        Route::patch('/admin/users/{user}/role', [AdminUserController::class, 'updateRole']);
        Route::apiResource('users', UserController::class)->except(['store']);
        Route::post('/tags', [TagController::class, 'store']);
        Route::put('/tags/{tag}', [TagController::class, 'update']);
        Route::delete('/tags/{tag}', [TagController::class, 'destroy']);
    });
});
