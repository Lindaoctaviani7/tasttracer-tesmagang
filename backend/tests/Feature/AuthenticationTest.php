<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_registration_creates_a_member_and_returns_a_sanctum_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'new-member@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.name', 'New Member')
            ->assertJsonPath('data.user.email', 'new-member@example.test')
            ->assertJsonPath('data.user.role', UserRole::Member->value)
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token')
            ->assertJsonPath('message', 'Registration successful.');

        $user = User::query()->where('email', 'new-member@example.test')->sole();
        $this->assertSame(UserRole::Member, $user->role);
        $this->assertTrue(Hash::check('StrongPass123!', $user->password));

        $plainTextToken = $response->json('data.token');
        $this->assertIsString($plainTextToken);
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'task-management-frontend',
            'token' => hash('sha256', Str::after($plainTextToken, '|')),
        ]);
        $this->assertNotNull($user->tokens()->sole()->expires_at);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'token' => $plainTextToken,
        ]);
    }

    public function test_registration_requires_name_email_password_and_confirmation(): void
    {
        $this->postJson('/api/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password'])
            ->assertJsonPath('errors.name.0', 'The name field is required.')
            ->assertJsonPath('errors.email.0', 'The email field is required.')
            ->assertJsonPath('errors.password.0', 'The password field is required.');
    }

    public function test_registration_rejects_an_invalid_email_address(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'not-an-email',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'The email field must be a valid email address.');
    }

    public function test_registration_rejects_an_email_that_is_already_registered(): void
    {
        User::factory()->create(['email' => 'existing@example.test']);

        $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'existing@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_requires_a_strong_confirmed_password(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'new-member@example.test',
            'password' => 'password',
            'password_confirmation' => 'different',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_registration_rejects_a_password_confirmation_that_does_not_match(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'new-member@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'DifferentPass123!',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_registration_rejects_a_role_supplied_by_the_client(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Member',
            'email' => 'new-member@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'role' => 'admin',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'new-member@example.test']);
    }

    public function test_login_returns_a_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'member@example.test',
            'password' => 'StrongPass123!',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'member@example.test',
            'password' => 'StrongPass123!',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Login successful.')
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.role', UserRole::Member->value)
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token');

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'task-management-frontend',
        ]);

        $this->withToken($response->json('data.token'))->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);
    }

    public function test_login_rejects_an_incorrect_password_without_disclosing_credentials(): void
    {
        User::factory()->create([
            'email' => 'member@example.test',
            'password' => 'StrongPass123!',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'member@example.test',
            'password' => 'IncorrectPass123!',
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'The provided credentials are incorrect.')
            ->assertJsonPath(
                'errors.email.0',
                'The provided credentials are incorrect.',
            )
            ->assertJsonMissingPath('data.token');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_uses_the_same_response_for_an_unknown_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'unknown@example.test',
            'password' => 'IncorrectPass123!',
        ]);

        $response->assertUnprocessable()
            ->assertExactJson([
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ]);
    }

    public function test_login_validates_required_and_email_fields(): void
    {
        $this->postJson('/api/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password'])
            ->assertJsonPath('errors.email.0', 'The email field is required.')
            ->assertJsonPath('errors.password.0', 'The password field is required.');
    }

    public function test_user_endpoint_requires_a_valid_bearer_token(): void
    {
        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->withToken('invalid-token')->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_user_endpoint_does_not_accept_a_session_without_a_bearer_token(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_unauthenticated_api_requests_without_json_accept_headers_return_401_json(): void
    {
        $this->get('/api/user', ['Accept' => '*/*'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_user_endpoint_returns_the_authenticated_public_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Authenticated Member',
            'email' => 'member@example.test',
        ]);
        $token = $user->createToken('test-client')->plainTextToken;

        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('message', 'Authenticated user retrieved successfully.')
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.name', 'Authenticated Member')
            ->assertJsonPath('data.user.email', 'member@example.test')
            ->assertJsonPath('data.user.role', UserRole::Member->value)
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token');
    }

    public function test_logout_revokes_only_the_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('current-client');
        $otherToken = $user->createToken('other-client');

        $this->withToken($token->plainTextToken)->postJson('/api/logout')
            ->assertOk()
            ->assertExactJson([
                'message' => 'Logout successful.',
                'data' => null,
            ]);

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->accessToken->id]);

        Auth::forgetGuards();
        $this->withToken($token->plainTextToken)->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/logout')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_expired_access_tokens_cannot_access_protected_endpoints(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('expired-client', ['*'], Carbon::now()->subMinute());

        $this->withToken($token->plainTextToken)->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_login_limits_repeated_attempts_for_the_same_email_and_ip(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/login', [
                'email' => 'member@example.test',
                'password' => 'IncorrectPass123!',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/login', [
            'email' => 'member@example.test',
            'password' => 'IncorrectPass123!',
        ])->assertTooManyRequests();
    }
}
