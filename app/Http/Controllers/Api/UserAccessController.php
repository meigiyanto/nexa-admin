<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class UserAccessController extends Controller
{
    public function show(User $user)
    {
        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
        ]);
    }

    public function assignRoles(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own roles.');

        $validated = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*' => ['required', 'string', 'distinct', 'exists:roles,name'],
        ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $validated['roles'])
            ->get();

        if ($roles->count() !== count($validated['roles'])) {
            return response()->json([
                'message' => 'One or more roles are invalid.',
            ], 422);
        }

        if ($roles->contains('name', 'admin') &&
            ! $request->user()->can('users.assign-admin-role')) {
            abort(403, 'You cannot assign the admin role.');
        }

        $user->syncRoles($roles);

        return $this->show($user);
    }

    public function assignPermissions(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own permissions.');

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required', 'string', 'distinct', 'exists:permissions,name'],
        ]);

        if (in_array('users.assign-admin-role', $validated['permissions'], true) &&
            ! $request->user()->can('users.assign-admin-role')) {
            abort(403, 'You cannot grant administrator assignment permission.');
        }

        $user->syncPermissions($validated['permissions']);

        return $this->show($user);
    }
}
