<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'data' => null,
            ], 401);
        }

        if (! $user instanceof User || $user->role->value !== $role) {
            return response()->json([
                'message' => 'This action is unauthorized.',
                'data' => null,
            ], 403);
        }

        return $next($request);
    }
}
