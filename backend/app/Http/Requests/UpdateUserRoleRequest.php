<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $targetUser = $this->route('user');

        return $user !== null
            && $targetUser instanceof User
            && $targetUser->getKey() !== $user->getAuthIdentifier();
    }

    public function rules(): array
    {
        return [
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }
}
