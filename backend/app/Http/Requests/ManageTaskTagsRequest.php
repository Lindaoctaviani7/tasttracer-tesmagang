<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ManageTaskTagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'tag_ids' => ['required', 'array', 'list', 'min:1'],
            'tag_ids.*' => ['required', 'integer', 'distinct', 'exists:tags,id'],
        ];
    }
}
