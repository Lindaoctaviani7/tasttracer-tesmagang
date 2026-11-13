<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => [$this->isMethod('PUT') ? 'required' : 'sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_completed' => ['sometimes', 'boolean'],
            'created_by' => ['prohibited'],
        ];
    }
}
