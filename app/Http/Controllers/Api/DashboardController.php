<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\User;
use Illuminate\\Http\\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $monthlyUsers = collect(range(5, 0))->map(function (int $monthsAgo): array {
            $date = now()->startOfMonth()->subMonths($monthsAgo);

            return [
                'month' => $date->format('M'),
                'users' => User::query()
                    ->whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->count(),
            ];
        });

        $recentUsers = User::query()
            ->with('roles:id,name')
            ->latest()
            ->limit(6)
            ->get(['id', 'name', 'email', 'status', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values(),
                'status' => $user->status,
                'created_at' => $user->created_at,
            ]);

        return response()->json([
            'stats' => [
                'total_users' => User::count(),
                'active_users' => User::where('status', 'active')->count(),
                'inactive_users' => User::where('status', 'inactive')->count(),
                'new_users' => User::whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->count(),
            ],
            'chart' => $monthlyUsers,
            'recent_users' => $recentUsers,
        ]);
    }
}
