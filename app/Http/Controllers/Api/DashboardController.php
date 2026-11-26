<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $monthlyUsers = collect(range(5, 0))->map(function ($monthsAgo) {
            $date = now()->startOfMonth()->subMonths($monthsAgo);

            return [
                'month' => $date->format('M'),
                'users' => User::whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->count(),
            ];
        });

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
            'recent_users' => User::latest()
                ->limit(6)
                ->get(['id', 'name', 'email', 'role', 'status', 'created_at']),
        ]);
    }
}
