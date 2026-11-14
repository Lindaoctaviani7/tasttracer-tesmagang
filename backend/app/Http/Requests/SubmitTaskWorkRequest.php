<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitTaskWorkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('submitWork', $this->route('task')) ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['in_progress', 'completed'])],
            'submission' => [
                Rule::requiredIf($this->input('status') === 'completed'),
                'nullable',
                'string',
                'max:10000',
            ],
        ];
    }
}
