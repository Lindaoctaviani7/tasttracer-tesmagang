<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
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
            ])->all(),
            'tags' => TagResource::collection($this->tags)->resolve(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
