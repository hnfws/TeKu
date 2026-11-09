<?php

namespace App\Services;

use App\Models\LoanInstallment;
use App\Models\TeKuModalVoucher;
use App\Models\User;
use Illuminate\Support\Str;

class TeKuModalRewards
{
    public function onTimeInstallments(User $user): int
    {
        return LoanInstallment::query()
            ->whereHas('loanApplication', fn ($query) => $query->where('user_id', $user->id))
            ->where('status', 'paid')
            ->whereRaw('DATE(paid_at) <= due_date')
            ->count();
    }

    public function xp(int $onTimeInstallments): int
    {
        $xpPerReward = (int) config('tekumodal.xp_per_reward');
        $earnedXp = $onTimeInstallments * (int) config('tekumodal.xp_per_on_time_installment');

        return $earnedXp % $xpPerReward;
    }

    public function earnsPointsAt(int $onTimeInstallments): bool
    {
        $xpPerReward = (int) config('tekumodal.xp_per_reward');
        $earnedXp = $onTimeInstallments * (int) config('tekumodal.xp_per_on_time_installment');
        $previousXp = max(0, $onTimeInstallments - 1) * (int) config('tekumodal.xp_per_on_time_installment');

        return $onTimeInstallments > 0 && intdiv($earnedXp, $xpPerReward) > intdiv($previousXp, $xpPerReward);
    }

    public function pointsBalance(User $user, ?int $onTimeInstallments = null): int
    {
        $xpPerReward = (int) config('tekumodal.xp_per_reward');
        $earnedXp = ($onTimeInstallments ?? $this->onTimeInstallments($user)) * (int) config('tekumodal.xp_per_on_time_installment');
        $earnedPoints = intdiv($earnedXp, $xpPerReward) * (int) config('tekumodal.points_per_reward');
        $spentPoints = $user->tekumodalVouchers()->sum('points_cost');

        return max(0, $earnedPoints - (int) $spentPoints);
    }

    public function rewardFor(string $type): ?array
    {
        foreach (config('tekumodal.rewards', []) as $reward) {
            if ($reward['type'] === $type) {
                return $reward;
            }
        }

        return null;
    }

    public function canRedeem(User $user, array $reward, int $pointsBalance): bool
    {
        if ($reward['first_loan_only']) {
            return ! $user->loanApplications()->exists()
                && ! $user->tekumodalVouchers()->where('type', $reward['type'])->exists();
        }

        return $pointsBalance >= $reward['points_cost'];
    }

    public function createVoucher(User $user, array $reward): TeKuModalVoucher
    {
        do {
            $code = 'TEKU-'.Str::upper(Str::random(12));
        } while (TeKuModalVoucher::query()->where('code', $code)->exists());

        return $user->tekumodalVouchers()->create([
            'code' => $code,
            'type' => $reward['type'],
            'points_cost' => $reward['points_cost'],
            'discount_percentage' => $reward['discount_percentage'] ?? 0,
            'max_discount_amount' => $reward['max_discount_amount'],
            'interest_rate' => $reward['interest_rate'],
            'status' => 'available',
            'claimed_at' => now(),
        ]);
    }
}
