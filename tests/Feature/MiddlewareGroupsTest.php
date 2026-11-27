<?php

namespace Tests\Feature;

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Tests\TestCase;

class MiddlewareGroupsTest extends TestCase
{
    public function test_laravel_default_web_and_api_middleware_groups_are_registered(): void
    {
        // Resolving the HTTP kernel applies the middleware configuration from bootstrap/app.php.
        $this->app->make(HttpKernel::class);

        $groups = $this->app->make('router')->getMiddlewareGroups();

        $this->assertArrayHasKey('web', $groups);
        $this->assertArrayHasKey('api', $groups);
        $this->assertContains(StartSession::class, $groups['web']);
        $this->assertContains(SubstituteBindings::class, $groups['web']);
        $this->assertContains(SubstituteBindings::class, $groups['api']);
    }
}
