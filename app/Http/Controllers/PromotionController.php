<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PromotionController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $now = now();
        $query = Promotion::query()->where('user_id', $userId);

        if ($search = mb_strtolower(trim((string) $request->query('search')))) {
            $query->whereRaw('LOWER(code) LIKE ?', ['%'.$search.'%']);
        }

        $status = $request->query('status');
        if ($status === 'active') {
            $query->whereRaw('is_active IS TRUE')
                ->where(fn (Builder $builder) => $builder->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
                ->where(fn (Builder $builder) => $builder->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
        } elseif ($status === 'scheduled') {
            $query->whereRaw('is_active IS TRUE')->where('starts_at', '>', $now);
        } elseif ($status === 'expired') {
            $query->whereRaw('is_active IS TRUE')->whereNotNull('ends_at')->where('ends_at', '<', $now);
        } elseif ($status === 'inactive') {
            $query->whereRaw('is_active IS FALSE');
        }

        return Inertia::render('promotions/index', [
            'promotions' => $query->latest()->paginate(8)->withQueryString(),
            'filters' => $request->only(['search', 'status']),
            'metrics' => [
                'active' => Promotion::query()->where('user_id', $userId)
                    ->whereRaw('is_active IS TRUE')
                    ->where(fn (Builder $builder) => $builder->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
                    ->where(fn (Builder $builder) => $builder->whereNull('ends_at')->orWhere('ends_at', '>=', $now))
                    ->count(),
                'expired' => Promotion::query()->where('user_id', $userId)
                    ->whereRaw('is_active IS TRUE')->whereNotNull('ends_at')->where('ends_at', '<', $now)
                    ->count(),
                'total' => Promotion::query()->where('user_id', $userId)->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data['user_id'] = $request->user()->id;
        $data['code'] = mb_strtoupper(trim($data['code']));

        Promotion::create($data);

        return to_route('promotions.index')->with('success', 'Promo berhasil dibuat dan diaktifkan.');
    }

    public function update(Request $request, Promotion $promotion): RedirectResponse
    {
        abort_unless($promotion->user_id === $request->user()->id, 404);
        $data = $this->validatedData($request, $promotion);
        $data['code'] = mb_strtoupper(trim($data['code']));
        $data['is_active'] = DB::raw($request->boolean('is_active') ? 'TRUE' : 'FALSE');

        $isActive = $data['is_active'];
        unset($data['is_active']);
        $promotion->update($data);
        Promotion::query()->whereKey($promotion->id)->update(['is_active' => $isActive]);
        $promotion->refresh();

        return to_route('promotions.index')->with('success', 'Promo berhasil diperbarui.');
    }

    public function toggle(Request $request, Promotion $promotion): RedirectResponse
    {
        abort_unless($promotion->user_id === $request->user()->id, 404);

        Promotion::query()->whereKey($promotion->id)->update(['is_active' => DB::raw('NOT is_active')]);
        $promotion->refresh();

        return to_route('promotions.index')->with(
            'success',
            $promotion->is_active ? 'Promo berhasil diaktifkan.' : 'Promo berhasil dinonaktifkan.'
        );
    }

    public function destroy(Request $request, Promotion $promotion): RedirectResponse
    {
        abort_unless($promotion->user_id === $request->user()->id, 404);
        $promotion->delete();

        return to_route('promotions.index')->with('success', 'Promo berhasil dihapus.');
    }

    private function validatedData(Request $request, ?Promotion $promotion = null): array
    {
        $userId = $request->user()->id;
        $data = $request->validate([
            'code' => ['required', 'string', 'max:80'],
            'discount_type' => ['required', Rule::in(['percent', 'amount'])],
            'discount_value' => [
                'required',
                'numeric',
                'gt:0',
                ...($request->input('discount_type') === 'percent' ? ['lte:100'] : []),
            ],
            'minimum_purchase' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'maximum_discount' => ['nullable', 'numeric', 'gt:0', 'max:9999999999.99'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $duplicate = Promotion::query()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($data['code']))])
            ->when($promotion, fn (Builder $query) => $query->whereKeyNot($promotion->id))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'code' => 'Kode promo tersebut sudah digunakan di akun Anda.',
            ]);
        }

        $data['minimum_purchase'] = $data['minimum_purchase'] ?? 0;

        return $data;
    }
}
