<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    public function pos(Request $request): Response
    {
        return Inertia::render('sales/pos', [
            'products' => InventoryProduct::query()
                ->where('user_id', $request->user()->id)
                ->where('stock_quantity', '>', 0)
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'category', 'stock_quantity', 'unit', 'selling_price', 'image_path']),
            'customerName' => $request->user()->name,
            'promotionsAvailable' => Promotion::query()
                ->whereRaw('is_active IS TRUE')
                ->where(fn (Builder $query) => $query->whereNull('user_id')->orWhere('user_id', $request->user()->id))
                ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
                ->exists(),
        ]);
    }

    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $today = now()->startOfDay();
        $month = now()->startOfMonth();
        $query = Sale::query()->where('user_id', $userId);

        if ($search = trim((string) $request->query('search'))) {
            $query->where(fn (Builder $builder) => $builder
                ->where('transaction_code', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%"));
        }

        if ($paymentMethod = $request->query('payment_method')) {
            $query->where('payment_method', $paymentMethod);
        }

        return Inertia::render('sales/index', [
            'sales' => $query->withCount('items')->latest('sold_at')->paginate(10)->withQueryString(),
            'filters' => $request->only(['search', 'payment_method']),
            'metrics' => [
                'today' => (float) Sale::query()->where('user_id', $userId)->where('sold_at', '>=', $today)->sum('total_amount'),
                'month' => (float) Sale::query()->where('user_id', $userId)->where('sold_at', '>=', $month)->sum('total_amount'),
                'todayCount' => Sale::query()->where('user_id', $userId)->where('sold_at', '>=', $today)->count(),
            ],
            'bestSellers' => SaleItem::query()
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.user_id', $userId)
                ->where('sales.sold_at', '>=', $today)
                ->select('sale_items.product_name', 'sale_items.category')
                ->selectRaw('SUM(sale_items.quantity) as quantity_sold, SUM(sale_items.line_total) as revenue')
                ->groupBy('sale_items.product_name', 'sale_items.category')
                ->orderByDesc('quantity_sold')
                ->limit(5)
                ->get(),
        ]);
    }

    public function report(Request $request): Response
    {
        $validated = $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $selectedMonth = isset($validated['month'])
            ? Carbon::createFromFormat('!Y-m', $validated['month'])
            : now()->startOfMonth();
        $userId = $request->user()->id;
        $firstMonth = $selectedMonth->copy()->subMonths(5)->startOfMonth();
        $lastMonth = $selectedMonth->copy()->endOfMonth();
        $productRevenue = [];
        SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.user_id', $userId)
            ->whereBetween('sales.sold_at', [$firstMonth, $lastMonth])
            ->select('sale_items.product_name', 'sale_items.line_total', 'sales.sold_at')
            ->orderBy('sale_items.id')
            ->chunk(1000, function ($items) use (&$productRevenue) {
                foreach ($items as $item) {
                    $month = Carbon::parse($item->sold_at)->format('Y-m');
                    $productRevenue[$item->product_name] ??= ['total' => 0, 'months' => []];
                    $productRevenue[$item->product_name]['total'] += (float) $item->line_total;
                    $productRevenue[$item->product_name]['months'][$month] =
                        ($productRevenue[$item->product_name]['months'][$month] ?? 0) + (float) $item->line_total;
                }
            });

        $chartSeries = collect($productRevenue)
            ->sortByDesc('total')
            ->take(3)
            ->map(fn (array $totals, string $name) => [
                'name' => $name,
                'months' => $totals['months'],
            ])
            ->values();

        $chart = collect(range(0, 5))->map(function (int $offset) use ($firstMonth, $chartSeries) {
            $date = $firstMonth->copy()->addMonths($offset);

            return [
                'month' => $date->format('Y-m'),
                'label' => $date->translatedFormat('M'),
                'series' => $chartSeries->map(fn (array $series) => [
                    'name' => $series['name'],
                    'revenue' => (float) ($series['months'][$date->format('Y-m')] ?? 0),
                ])->all(),
            ];
        });

        $productQuery = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.user_id', $userId)
            ->whereBetween('sales.sold_at', [$selectedMonth->copy()->startOfMonth(), $selectedMonth->copy()->endOfMonth()])
            ->select('sale_items.product_name', 'sale_items.category')
            ->selectRaw('SUM(sale_items.quantity) as quantity_sold, SUM(sale_items.line_total) as revenue')
            ->groupBy('sale_items.product_name', 'sale_items.category')
            ->orderByDesc('quantity_sold');

        if ($search = trim((string) $request->query('search'))) {
            $productQuery->where('sale_items.product_name', 'like', "%{$search}%");
        }

        return Inertia::render('sales/report', [
            'month' => $selectedMonth->format('Y-m'),
            'chart' => $chart,
            'bestSellers' => $productQuery->paginate(8)->withQueryString(),
            'metrics' => [
                'totalRevenue' => (float) Sale::query()
                    ->where('user_id', $userId)
                    ->whereBetween('sold_at', [$selectedMonth->copy()->startOfMonth(), $selectedMonth->copy()->endOfMonth()])
                    ->sum('total_amount'),
                'transactionCount' => Sale::query()
                    ->where('user_id', $userId)
                    ->whereBetween('sold_at', [$selectedMonth->copy()->startOfMonth(), $selectedMonth->copy()->endOfMonth()])
                    ->count(),
            ],
            'filters' => $request->only(['search']),
        ]);
    }

    public function show(Request $request, Sale $sale): Response
    {
        abort_unless($sale->user_id === $request->user()->id, 404);
        $sale->load('items.product:id,image_path');

        return Inertia::render('sales/show', ['sale' => $sale]);
    }

    public function applyPromotion(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:80'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
        ]);

        $cart = $this->cartProducts($request, $validated['items']);
        $subtotal = $cart->sum(fn (array $item) => (float) $item['product']->selling_price * $item['quantity']);
        $promotion = $this->findPromotion($request, $validated['code']);

        if (! $promotion) {
            throw ValidationException::withMessages(['code' => 'Kode promo tidak ditemukan atau sudah tidak aktif.']);
        }

        if ($subtotal < (float) $promotion->minimum_purchase) {
            throw ValidationException::withMessages([
                'code' => 'Belanja minimum untuk promo ini adalah Rp'.number_format((float) $promotion->minimum_purchase, 0, ',', '.').'.',
            ]);
        }

        return response()->json([
            'code' => $promotion->code,
            'discount' => $this->promotionDiscount($promotion, $subtotal),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['required', 'in:cash,qris,debit'],
            'promo_code' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $sale = DB::transaction(function () use ($request, $validated) {
            $cart = $this->cartProducts($request, $validated['items'], lock: true);
            $subtotal = round($cart->sum(fn (array $item) => (float) $item['product']->selling_price * $item['quantity']), 2);
            $promotion = filled($validated['promo_code'] ?? null)
                ? $this->findPromotion($request, $validated['promo_code'])
                : null;

            if (filled($validated['promo_code'] ?? null) && ! $promotion) {
                throw ValidationException::withMessages(['promo_code' => 'Kode promo tidak ditemukan atau sudah tidak aktif.']);
            }

            if ($promotion && $subtotal < (float) $promotion->minimum_purchase) {
                throw ValidationException::withMessages(['promo_code' => 'Jumlah belanja belum memenuhi minimum promo.']);
            }

            $discount = $promotion ? $this->promotionDiscount($promotion, $subtotal) : 0;
            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'customer_name' => filled($validated['customer_name'] ?? null) ? trim($validated['customer_name']) : null,
                'payment_method' => $validated['payment_method'],
                'promo_code' => $promotion?->code,
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'total_amount' => round($subtotal - $discount, 2),
                'notes' => $validated['notes'] ?? null,
                'sold_at' => now(),
            ]);
            $sale->transaction_code = 'TEKU'.str_pad((string) $sale->id, 9, '0', STR_PAD_LEFT);
            $sale->save();

            foreach ($cart as $item) {
                $product = $item['product'];
                $quantity = $item['quantity'];
                $lineTotal = round((float) $product->selling_price * $quantity, 2);
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'inventory_product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'category' => $product->category,
                    'quantity' => $quantity,
                    'unit_price' => $product->selling_price,
                    'line_total' => $lineTotal,
                ]);
                $product->decrement('stock_quantity', $quantity);
                InventoryMovement::create([
                    'inventory_product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'out',
                    'quantity' => $quantity,
                    'note' => 'Penjualan '.$sale->transaction_code,
                ]);
            }

            return $sale;
        });

        return to_route('sales.show', $sale)->with('success', 'Transaksi berhasil disimpan.');
    }

    private function cartProducts(Request $request, array $items, bool $lock = false)
    {
        $productIds = collect($items)->pluck('product_id')->map(fn ($id) => (int) $id)->unique()->sort()->values();
        $productsQuery = InventoryProduct::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $productIds);

        if ($lock) {
            $productsQuery->lockForUpdate();
        }

        $products = $productsQuery->get()->keyBy('id');
        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages(['items' => 'Satu atau beberapa produk tidak tersedia. Muat ulang halaman dan coba kembali.']);
        }

        return collect($items)->map(function (array $item) use ($products) {
            $product = $products->get((int) $item['product_id']);
            $quantity = (int) $item['quantity'];

            if ($product->stock_quantity < $quantity) {
                throw ValidationException::withMessages([
                    'items' => "Stok {$product->name} hanya tersisa {$product->stock_quantity} {$product->unit}.",
                ]);
            }

            return ['product' => $product, 'quantity' => $quantity];
        });
    }

    private function findPromotion(Request $request, string $code): ?Promotion
    {
        return Promotion::query()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))])
            ->whereRaw('is_active IS TRUE')
            ->where(fn (Builder $query) => $query->whereNull('user_id')->orWhere('user_id', $request->user()->id))
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$request->user()->id])
            ->first();
    }

    private function promotionDiscount(Promotion $promotion, float $subtotal): float
    {
        $discount = $promotion->discount_type === 'percent'
            ? $subtotal * (float) $promotion->discount_value / 100
            : (float) $promotion->discount_value;

        if ($promotion->maximum_discount !== null) {
            $discount = min($discount, (float) $promotion->maximum_discount);
        }

        return round(min($subtotal, $discount), 2);
    }
}
