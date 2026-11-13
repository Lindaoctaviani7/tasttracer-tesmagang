<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    public function test_root_route_returns_service_metadata(): void
    {
        $this->getJson('/')
            ->assertOk()
            ->assertJsonStructure(['name', 'status']);
    }

    public function test_api_health_endpoint_returns_json(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_api_preflight_allows_the_configured_frontend_origin(): void
    {
        $origin = config('cors.allowed_origins')[0];

        $this->withHeaders([
            'Origin' => $origin,
            'Access-Control-Request-Method' => 'GET',
        ])->options('/api/health')
            ->assertNoContent()
            ->assertHeader('access-control-allow-origin', $origin);
    }
}
