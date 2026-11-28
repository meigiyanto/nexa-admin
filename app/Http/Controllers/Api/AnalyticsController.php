<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->validatedDateRange($request);
        $users = User::query()->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()]);
        $dailyRegistrations = (clone $users)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total')
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at)')
            ->pluck('total', 'date');

        $chart = collect();
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $key = $date->toDateString();
            $chart->push(['date' => $key, 'users' => (int) ($dailyRegistrations[$key] ?? 0)]);
        }

        return response()->json([
            'filters' => ['start_date' => $startDate->toDateString(), 'end_date' => $endDate->toDateString()],
            'summary' => [
                'total_users' => (clone $users)->count(),
                'active_users' => (clone $users)->where('status', 'active')->count(),
                'inactive_users' => (clone $users)->where('status', 'inactive')->count(),
            ],
            'registrations' => $chart,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->validatedDateRange($request);

        return response()->streamDownload(function () use ($startDate, $endDate): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['Name', 'Email', 'Status', 'Registered At']);

            User::query()
                ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                ->orderBy('created_at')
                ->chunk(500, function ($users) use ($output): void {
                    foreach ($users as $user) {
                        fputcsv($output, [
                            $this->safeCsvValue($user->name),
                            $this->safeCsvValue($user->email),
                            $this->safeCsvValue($user->status),
                            $user->created_at?->toDateTimeString(),
                        ]);
                    }
                });

            fclose($output);
        }, 'user-analytics-'.$startDate->toDateString().'-to-'.$endDate->toDateString().'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function validatedDateRange(Request $request): array
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);

        $startDate = Carbon::createFromFormat('Y-m-d', $validated['start_date'])->startOfDay();
        $endDate = Carbon::createFromFormat('Y-m-d', $validated['end_date'])->startOfDay();
        abort_if($startDate->diffInDays($endDate) > 365, 422, 'The selected date range cannot exceed 366 days.');

        return [$startDate, $endDate];
    }

    private function safeCsvValue(?string $value): string
    {
        $value ??= '';

        return preg_match('/^[=+@\\-\\t\\r]/', $value) === 1 ? "'".$value : $value;
    }
}
