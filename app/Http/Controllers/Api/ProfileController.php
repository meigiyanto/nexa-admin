<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password:web'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        $request->user('web')->forceFill([
            'password' => $validated['password'],
        ])->save();

        if (config('session.driver') === 'database') {
            DB::table('sessions')->where('user_id', $request->user('web')->id)
                ->where('id', '!=', $request->session()->getId())->delete();
        }

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user('web');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'photo' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_photo' => ['sometimes', 'boolean'],
        ]);

        $oldPhoto = $user->profile_photo_path;
        $newPhoto = null;

        if ($request->hasFile('photo')) {
            $newPhoto = $request->file('photo')->store('profile-photos', 'public');
        }

        $emailChanged = $user->email !== $validated['email'];
        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        if ($newPhoto) {
            $user->profile_photo_path = $newPhoto;
        } elseif (($validated['remove_photo'] ?? false) && ! $request->hasFile('photo')) {
            $user->profile_photo_path = null;
        }

        $user->save();

        if ($oldPhoto && $oldPhoto !== $user->profile_photo_path) {
            Storage::disk('public')->delete($oldPhoto);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'profile_photo_url' => $user->profile_photo_url,
                'email_verified_at' => $user->email_verified_at,
            ],
        ]);
    }
}
