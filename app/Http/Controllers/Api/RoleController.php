<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return response()->json(
            Role::with('permissions')
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->paginate(15)
        );
    }

    public function show(Role $role)
    {
        abort_unless($role->guard_name === 'web', 404);

        return response()->json(
            $role->load('permissions')
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/', Rule::unique('roles')->where('guard_name', 'web')],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        return response()->json(
            $role->load('permissions'),
            201
        );
    }

    public function update(Request $request, Role $role)
    {
        abort_unless($role->guard_name === 'web', 404);
        abort_if($role->name === 'admin', 403, 'The admin role is protected.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/', Rule::unique('roles')->where('guard_name', 'web')->ignore($role->id)],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', 'exists:permissions,name'],
        ]);

        $role->update(['name' => $validated['name']]);

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json(
            $role->load('permissions')
        );
    }

    public function destroy(Role $role)
    {
        abort_unless($role->guard_name === 'web', 404);
        abort_if(in_array($role->name, ['admin', 'editor', 'viewer'], true), 403, 'Built-in roles cannot be deleted.');

        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'This role is assigned to users and cannot be deleted.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }
}
