<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $targetUser = $this->route('user');

        return $user !== null
            && (! $this->exists('role')
                || ! $targetUser instanceof User
                || $targetUser->getKey() !== $user->getAuthIdentifier());
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            'role' => ['sometimes', 'required', Rule::enum(UserRole::class)],
        ];
    }
}
