<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $request->session()->forget([
            'two_factor_login_user_id',
            'two_factor_login_remember',
            'two_factor_login_expires_at',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive.'],
            ]);
        }

        if ($user->two_factor_confirmed_at && $user->two_factor_secret) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            $request->session()->regenerate();
            $request->session()->put([
                'two_factor_login_user_id' => $user->id,
                'two_factor_login_remember' => $request->boolean('remember'),
                'two_factor_login_expires_at' => now()->addMinutes(5)->timestamp,
            ]);

            return response()->json([
                'requires_two_factor' => true,
                'message' => 'Enter the code from your authenticator app.',
            ]);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return $this->userResponse($user);
    }

    public function verifyTwoFactor(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        abort_if(Auth::guard('web')->check(), 409, 'You are already signed in.');

        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:32'],
        ]);
        $userId = $request->session()->get('two_factor_login_user_id');
        $expiresAt = $request->session()->get('two_factor_login_expires_at');

        if (! $userId || ! $expiresAt || now()->timestamp > $expiresAt) {
            $request->session()->forget([
                'two_factor_login_user_id',
                'two_factor_login_remember',
                'two_factor_login_expires_at',
            ]);

            abort(422, 'The two-factor login challenge has expired. Please sign in again.');
        }

        $user = User::find($userId);

        abort_unless($user && $user->status === 'active' && $user->two_factor_confirmed_at && $user->two_factor_secret, 422,
            'The two-factor login challenge is no longer valid.');

        $code = trim($validated['code']);
        $valid = preg_match('/^\d{6}$/', $code)
            ? $twoFactor->verifyCode($user->two_factor_secret, $code)
            : $twoFactor->consumeRecoveryCode($user, $code);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid.'],
            ]);
        }

        $remember = (bool) $request->session()->get('two_factor_login_remember');
        $request->session()->forget([
            'two_factor_login_user_id',
            'two_factor_login_remember',
            'two_factor_login_expires_at',
        ]);

        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();

        return $this->userResponse($user);
    }

    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $user = User::where('email', $validated['email'])->where('status', 'active')->first();

        if ($user) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json([
            'message' => 'If an active account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! User::where('email', $validated['email'])->where('status', 'active')->exists()) {
            return response()->json(['message' => __('password.token')], 422);
        }

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                if (config('session.driver') === 'database') {
                    DB::table('sessions')->where('user_id', $user->id)->delete();
                }
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => __($status),
            ], 422);
        }

        return response()->json([
            'message' => 'Your password has been reset successfully. You can now sign in.',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return $this->userResponse($request->user('web'));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function userResponse(User $user): JsonResponse
    {
        return response()->json([
            'user' => [
                ...$user->only(['id', 'name', 'email', 'status']),
                'profile_photo_url' => $user->profile_photo_url,
                'two_factor_enabled' => (bool) $user->two_factor_confirmed_at,
            ],
            'roles' => $user->getRoleNames()->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ]);
    }
}
