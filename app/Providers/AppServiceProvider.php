<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->ip().'|'.$request->input('email')
            );
        });

        RateLimiter::for('two-factor', function (Request $request) {
            $challengeUserId = $request->session()->get('two_factor_login_user_id');

            return Limit::perMinute(5)->by(
                $challengeUserId ? 'user:'.$challengeUserId : 'ip:'.$request->ip()
            );
        });
    }
}
