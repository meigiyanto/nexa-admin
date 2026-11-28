<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LastActiveAdministratorGuard;
use App\Services\SystemActivityNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserAccessController extends Controller
{
    public function show(Request $request, User $user): JsonResponse
    {
        abort_unless(
            $request->user()->can('users.view') ||
            $request->user()->can('users.assign-roles') ||
            $request->user()->can('users.assign-permissions'),
            403
        );

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'status']),
            'roles' => $user->getRoleNames()->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name')->values(),
            'available_roles' => $request->user()->can('users.assign-roles')
                ? Role::query()->with('permissions')->where('guard_name', 'web')->orderBy('name')->get()
                    ->filter(fn (Role $role): bool => $user->hasRole($role->name) || ($role->name === 'admin' && $request->user()->can('users.assign-admin-role')) || $role->permissions->pluck('name')->diff($request->user()->getAllPermissions()->pluck('name'))->isEmpty())
                    ->map(fn (Role $role): array => ['id' => $role->id, 'name' => $role->name])
                    ->values()
                : [],
            'available_permissions' => $request->user()->can('users.assign-permissions')
                ? Permission::query()
                    ->where('guard_name', 'web')
                    ->whereIn('name', $request->user()->getAllPermissions()->pluck('name')->merge($user->getDirectPermissions()->pluck('name')))
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
        ]);
    }

    public function assignRoles(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own roles.');

        $validated = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'string', 'distinct', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $validated['roles'])
            ->get();

        if ($roles->count() !== count($validated['roles'])) {
            return response()->json(['message' => 'One or more roles are invalid.'], 422);
        }

        $actor = $request->user();

        $updatedUser = DB::transaction(function () use ($actor, $roles, $user): User {
            $guard = app(LastActiveAdministratorGuard::class);
            $activeAdminIds = $guard->lockActiveAdminIds();
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            if (
                $roles->contains('name', 'admin') &&
                ! $lockedUser->hasRole('admin') &&
                ! $actor->can('users.assign-admin-role')
            ) {
                abort(403, 'You cannot assign the admin role.');
            }

            $actorPermissions = $actor->getAllPermissions()->pluck('name');
            $newRolePermissions = $roles
                ->reject(fn (Role $role): bool => $lockedUser->hasRole($role->name) ||
                    ($role->name === 'admin' && $actor->can('users.assign-admin-role')))
                ->flatMap(fn (Role $role) => $role->permissions()->pluck('name'))
                ->unique();

            abort_if(
                $newRolePermissions->diff($actorPermissions)->isNotEmpty(),
                403,
                'You cannot assign a role with permissions that you do not have.'
            );

            $willRemainAdmin = $roles->contains('name', 'admin');

            if (
                $lockedUser->hasRole('admin') &&
                ! $willRemainAdmin &&
                $lockedUser->status === 'active' &&
                $guard->isLastActiveAdmin($lockedUser, $activeAdminIds)
            ) {
                abort(422, 'The last active administrator cannot lose the admin role.');
            }

            $lockedUser->syncRoles($roles);

            return $lockedUser;
        });

        app(SystemActivityNotifier::class)->notifyRecipients(
            $actor,
            'User roles updated',
            "Roles for {$updatedUser->name} are now: ".$roles->pluck('name')->join(', ').'.',
            'user.roles.updated',
            '/users',
        );

        return $this->show($request, $updatedUser);
    }

    public function assignPermissions(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own permissions.');

        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['required', 'string', 'distinct', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $existingDirectPermissions = $user->getDirectPermissions()->pluck('name');
        $newPermissions = collect($validated['permissions'])->diff($existingDirectPermissions);
        $actorPermissions = $request->user()->getAllPermissions()->pluck('name');

        abort_if(
            $newPermissions->diff($actorPermissions)->isNotEmpty(),
            403,
            'You cannot grant permissions that you do not have.'
        );

        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $validated['permissions'])
            ->get();

        $user->syncPermissions($permissions);

        app(SystemActivityNotifier::class)->notifyRecipients(
            $request->user(),
            'User permissions updated',
            "Direct permissions for {$user->name} were changed.",
            'user.permissions.updated',
            '/users',
        );

        return $this->show($request, $user);
    }
}
