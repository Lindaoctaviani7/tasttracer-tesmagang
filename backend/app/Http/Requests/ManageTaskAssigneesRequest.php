<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ManageTaskAssigneesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'user_ids' => ['present', 'array', 'list'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ];
    }
}
