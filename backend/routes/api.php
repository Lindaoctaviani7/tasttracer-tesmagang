<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::apiResource('tasks', TaskController::class);
    Route::get('/tasks/{task}/assignees', [TaskController::class, 'indexAssignees']);
    Route::post('/tasks/{task}/assignees', [TaskController::class, 'storeAssignees']);
    Route::delete('/tasks/{task}/assignees/{userId}', [TaskController::class, 'destroyAssignee']);
    Route::put('/tasks/{task}/assignees', [TaskController::class, 'updateAssignees']);

    Route::middleware('role:admin')->group(function (): void {
        Route::apiResource('users', UserController::class)->except(['store']);
    });
});
