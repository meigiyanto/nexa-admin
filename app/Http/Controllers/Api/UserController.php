<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LastActiveAdministratorGuard;
use App\Services\SystemActivityNotifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $users = User::query()
            ->when($validated['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->with('roles:id,name')
            ->latest()
            ->paginate($validated['per_page'] ?? 10);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user): array => $this->userData($user))->values(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create($validated);
            $user->assignRole('viewer');

            return $user;
        });

        app(SystemActivityNotifier::class)->notifyRecipients(
            $request->user(),
            'New user created',
            "{$user->name} ({$user->email}) was added to the workspace.",
            'user.created',
            '/users',
        );

        return response()->json([
            'user' => $this->userData($user->load('roles:id,name')),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $this->userData($user->load('roles:id,name')),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name')->values(),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'inactive'])],
            'role' => ['prohibited'],
        ]);

        if ($request->user()->is($user) && ($validated['status'] ?? null) === 'inactive') {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        if (empty($validated['password'] ?? null)) {
            unset($validated['password']);
        }

        [$originalStatus, $updatedUser] = DB::transaction(function () use ($validated, $user): array {
            $guard = app(LastActiveAdministratorGuard::class);
            $activeAdminIds = ($validated['status'] ?? null) === 'inactive'
                ? $guard->lockActiveAdminIds()
                : collect();

            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $originalStatus = $lockedUser->status;

            if (
                ($validated['status'] ?? null) === 'inactive' &&
                $originalStatus === 'active' &&
                $lockedUser->hasRole('admin') &&
                $guard->isLastActiveAdmin($lockedUser, $activeAdminIds)
            ) {
                abort(422, 'The last active administrator cannot be deactivated.');
            }

            $lockedUser->update($validated);

            if ($originalStatus === 'active' && $lockedUser->status === 'inactive') {
                if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
                    DB::table('sessions')->where('user_id', $lockedUser->id)->delete();
                }

                $lockedUser->tokens()->delete();
            }

            return [$originalStatus, $lockedUser];
        });

        if ($originalStatus !== $updatedUser->status) {
            app(SystemActivityNotifier::class)->notifyRecipients(
                $request->user(),
                'User status changed',
                "{$updatedUser->name} was {$updatedUser->status}.",
                'user.status.updated',
                '/users',
            );
        }

        return response()->json([
            'user' => $this->userData($updatedUser->fresh()->load('roles:id,name')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 422, 'You cannot delete your own account.');

        $deletedName = DB::transaction(function () use ($user): string {
            $guard = app(LastActiveAdministratorGuard::class);
            $activeAdminIds = $guard->lockActiveAdminIds();
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            if (
                $lockedUser->hasRole('admin') &&
                $lockedUser->status === 'active' &&
                $guard->isLastActiveAdmin($lockedUser, $activeAdminIds)
            ) {
                abort(422, 'The last active administrator cannot be deleted.');
            }

            $name = $lockedUser->name;
            $lockedUser->delete();

            return $name;
        });

        app(SystemActivityNotifier::class)->notifyRecipients(
            $request->user(),
            'User deleted',
            "{$deletedName} was removed from the workspace.",
            'user.deleted',
            '/users',
        );

        return response()->json(['message' => 'User deleted successfully.']);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'roles' => $user->getRoleNames()->values(),
            'created_at' => $user->created_at,
        ];
    }
}
