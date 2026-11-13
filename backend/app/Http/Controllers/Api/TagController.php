<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTagRequest;
use App\Http\Requests\UpdateTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = Tag::query()->orderBy('name')->paginate(15);

        return response()->json([
            'message' => 'Tags retrieved successfully.',
            'data' => [
                'tags' => TagResource::collection($tags->getCollection())->resolve(),
                'pagination' => [
                    'current_page' => $tags->currentPage(),
                    'per_page' => $tags->perPage(),
                    'total' => $tags->total(),
                    'last_page' => $tags->lastPage(),
                ],
            ],
        ]);
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = Tag::query()->create($request->validated());

        return response()->json([
            'message' => 'Tag created successfully.',
            'data' => ['tag' => (new TagResource($tag))->resolve()],
        ], 201);
    }

    public function update(UpdateTagRequest $request, Tag $tag): JsonResponse
    {
        $tag->update($request->validated());

        return response()->json([
            'message' => 'Tag updated successfully.',
            'data' => ['tag' => (new TagResource($tag))->resolve()],
        ]);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $tag->delete();

        return response()->json([
            'message' => 'Tag deleted successfully.',
            'data' => null,
        ]);
    }
}
