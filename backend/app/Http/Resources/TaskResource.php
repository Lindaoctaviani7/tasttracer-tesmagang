<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $myAssignment = $this->assignees->firstWhere('id', $request->user()?->id);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'is_completed' => $this->is_completed,
            'created_by' => $this->created_by,
            'creator' => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ],
            'assignees' => $this->assignees->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'status' => $this->showAssigneeWork($request, $user) ? $user->pivot->status : null,
                'submission' => $this->showAssigneeWork($request, $user) ? $user->pivot->submission : null,
            ])->all(),
            'my_assignment' => $myAssignment === null ? null : [
                'status' => $myAssignment->pivot->status,
                'submission' => $myAssignment->pivot->submission,
            ],
            'tags' => TagResource::collection($this->tags)->resolve(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function showAssigneeWork(Request $request, User $assignee): bool
    {
        return $request->user()?->role === UserRole::Admin
            || $request->user()?->is($assignee);
    }
}
