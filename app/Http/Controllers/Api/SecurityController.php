<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SecurityController extends Controller
{
    public function sessions(Request $request): JsonResponse
    {
        $this->ensureDatabaseSessions();

        $currentId = $request->session()->getId();
        $sessions = DB::table('sessions')
            ->where('user_id', $request->user('web')->id)
            ->orderByDesc('last_activity')
            ->get();

        return response()->json([
            'sessions' => $sessions->map(fn ($session) => [
                'key' => hash_hmac('sha256', $session->id, (string) config('app.key')),
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent ?: 'Unknown device',
                'last_activity' => now()->setTimestamp($session->last_activity)->toIso8601String(),
                'is_current' => hash_equals($currentId, $session->id),
            ])->values(),
        ]);
    }

    public function revokeSession(Request $request, string $key): JsonResponse
    {
        $this->ensureDatabaseSessions();
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:web'],
        ]);
        $userId = $request->user('web')->id;
        $sessions = DB::table('sessions')->where('user_id', $userId)->get();
        $target = $sessions->first(fn ($session) => hash_equals(
            hash_hmac('sha256', $session->id, (string) config('app.key')),
            $key,
        ));

        abort_unless($target, 404);

        DB::table('sessions')->where('id', $target->id)->where('user_id', $userId)->delete();
        $request->user('web')->forceFill(['remember_token' => Str::random(60)])->save();

        if ($target->id === $request->session()->getId()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'Current session ended.']);
        }

        return response()->json(['message' => 'Session revoked successfully.']);
    }

    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $this->ensureDatabaseSessions();
        $request->validate(['current_password' => ['required', 'current_password:web']]);

        $deleted = DB::table('sessions')
            ->where('user_id', $request->user('web')->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
        $request->user('web')->forceFill(['remember_token' => Str::random(60)])->save();

        return response()->json([
            'message' => 'Other sessions revoked successfully.',
            'revoked' => $deleted,
        ]);
    }

    public function setupTwoFactor(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $request->validate(['current_password' => ['required', 'current_password:web']]);
        $user = $request->user('web');

        abort_if($user->two_factor_confirmed_at, 409, 'Two-factor authentication is already enabled.');

        $secret = $twoFactor->generateSecret();
        $request->session()->put('two_factor_setup_secret', $secret);

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $twoFactor->provisioningUri($user, $secret),
        ]);
    }

    public function enableTwoFactor(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'size:6']]);
        $secret = $request->session()->get('two_factor_setup_secret');

        abort_unless($secret, 422, 'Start two-factor setup before confirming it.');

        if (! $twoFactor->verifyCode($secret, $validated['code'])) {
            throw ValidationException::withMessages(['code' => ['The authenticator code is invalid.']]);
        }

        $codes = $twoFactor->generateRecoveryCodes();
        $request->user('web')->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => $twoFactor->hashRecoveryCodes($codes),
            'two_factor_confirmed_at' => now(),
        ])->save();
        $request->session()->forget('two_factor_setup_secret');

        return response()->json([
            'message' => 'Two-factor authentication enabled.',
            'recovery_codes' => $codes,
        ]);
    }

    public function disableTwoFactor(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'code' => ['required', 'string', 'max:32'],
        ]);
        $user = $request->user('web');

        abort_unless($user->two_factor_confirmed_at && $user->two_factor_secret, 409, 'Two-factor authentication is not enabled.');

        $valid = preg_match('/^\d{6}$/', $validated['code'])
            ? $twoFactor->verifyCode($user->two_factor_secret, $validated['code'])
            : $twoFactor->consumeRecoveryCode($user, $validated['code']);

        if (! $valid) {
            throw ValidationException::withMessages(['code' => ['The verification code is invalid.']]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function regenerateRecoveryCodes(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'code' => ['required', 'string', 'max:32'],
        ]);
        $user = $request->user('web');

        abort_unless($user->two_factor_confirmed_at && $user->two_factor_secret, 409, 'Two-factor authentication is not enabled.');

        if (! $twoFactor->verifyCode($user->two_factor_secret, $validated['code'])) {
            throw ValidationException::withMessages(['code' => ['The authenticator code is invalid.']]);
        }

        $codes = $twoFactor->generateRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => $twoFactor->hashRecoveryCodes($codes)])->save();

        return response()->json([
            'message' => 'Recovery codes regenerated.',
            'recovery_codes' => $codes,
        ]);
    }

    private function ensureDatabaseSessions(): void
    {
        abort_unless(config('session.driver') === 'database' && Schema::hasTable('sessions'), 503,
            'Session management requires the database session driver and sessions table.');
    }
}
