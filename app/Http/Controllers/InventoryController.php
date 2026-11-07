<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $query = InventoryProduct::query()->where('user_id', $userId);

        if ($search = trim((string) $request->query('search'))) {
            $query->where(fn ($builder) => $builder
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%"));
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($request->query('status') === 'low') {
            $query->whereColumn('stock_quantity', '<=', 'min_stock')->where('stock_quantity', '>', 0);
        } elseif ($request->query('status') === 'out') {
            $query->where('stock_quantity', 0);
        }

        $sort = $request->query('sort') === 'oldest' ? 'asc' : 'desc';
        $products = $query->orderBy('created_at', $sort)->orderBy('name')->paginate(8)->withQueryString();

        return Inertia::render('inventory/index', [
            'products' => $products,
            'filters' => $request->only(['search', 'category', 'status', 'sort']),
            'categories' => InventoryProduct::query()->where('user_id', $userId)->distinct()->orderBy('category')->pluck('category'),
            'stats' => [
                'units' => InventoryProduct::where('user_id', $userId)->sum('stock_quantity'),
                'products' => InventoryProduct::where('user_id', $userId)->count(),
                'value' => InventoryProduct::where('user_id', $userId)->selectRaw('SUM(stock_quantity * cost_price) as total')->value('total') ?? 0,
                'low' => InventoryProduct::where('user_id', $userId)->whereColumn('stock_quantity', '<=', 'min_stock')->where('stock_quantity', '>', 0)->count(),
                'out' => InventoryProduct::where('user_id', $userId)->where('stock_quantity', 0)->count(),
            ],
            'activities' => InventoryMovement::with('product:id,name')
                ->where('user_id', $userId)
                ->latest()
                ->limit(5)
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inventory/form');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data['user_id'] = $request->user()->id;
        $image = $request->file('image');
        unset($data['image']);
        if ($image) {
            $data['image_path'] = $image->store('inventory', 'public');
        }

        DB::transaction(function () use ($data, $request) {
            $product = InventoryProduct::create($data);
            if ($product->stock_quantity > 0) {
                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => 'in',
                    'quantity' => $product->stock_quantity,
                    'note' => 'Stok awal',
                ]);
            }
        });

        return to_route('inventory.index')->with('success', 'Barang berhasil ditambahkan.');
    }

    public function edit(Request $request, InventoryProduct $product): Response
    {
        abort_unless($product->user_id === $request->user()->id, 404);

        return Inertia::render('inventory/form', [
            'product' => [
                ...$product->toArray(),
                'production_date' => $product->production_date?->format('Y-m-d'),
                'expiration_date' => $product->expiration_date?->format('Y-m-d'),
            ],
        ]);
    }

    public function update(Request $request, InventoryProduct $product): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 404);
        $data = $this->validatedData($request, $product);
        $image = $request->file('image');
        unset($data['image']);
        $data['user_id'] = $request->user()->id;

        DB::transaction(function () use ($data, $image, $product, $request) {
            $previousStock = $product->stock_quantity;
            if ($image) {
                $data['image_path'] = $image->store('inventory', 'public');
            }
            $product->update($data);
            $difference = $product->stock_quantity - $previousStock;
            if ($difference !== 0) {
                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => $difference > 0 ? 'in' : 'out',
                    'quantity' => abs($difference),
                    'note' => 'Penyesuaian stok dari form barang',
                ]);
            }
        });

        return to_route('inventory.index')->with('success', 'Barang berhasil diperbarui.');
    }

    public function destroy(Request $request, InventoryProduct $product): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 404);
        $product->delete();

        return to_route('inventory.index')->with('success', 'Barang berhasil dihapus.');
    }

    public function adjustStock(Request $request, InventoryProduct $product): RedirectResponse
    {
        abort_unless($product->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'not_in:0'],
            'location' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($data, $product, $request) {
            $updated = InventoryProduct::query()
                ->whereKey($product->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();
            $quantity = (int) $data['quantity'];
            if ($updated->stock_quantity + $quantity < 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'Jumlah pengurangan melebihi stok yang tersedia.',
                ]);
            }
            $updated->increment('stock_quantity', $quantity);
            $updated->movements()->create([
                'user_id' => $request->user()->id,
                'type' => $quantity > 0 ? 'in' : 'out',
                'quantity' => abs($quantity),
                'location' => $data['location'] ?? null,
                'note' => $data['note'] ?? null,
            ]);
        });

        return back()->with('success', 'Stok berhasil diperbarui.');
    }

    private function validatedData(Request $request, ?InventoryProduct $product = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => [
                'required',
                'string',
                'max:80',
                Rule::unique('inventory_products', 'sku')
                    ->where('user_id', $request->user()->id)
                    ->ignore($product?->id),
            ],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:5000'],
            'unit' => ['required', 'string', 'max:40'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'min_stock' => ['required', 'integer', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'production_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date', 'after_or_equal:production_date'],
            'image' => ['nullable', 'image', 'max:5120'],
        ]);
    }
}
