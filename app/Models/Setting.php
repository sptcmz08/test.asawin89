<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];
    public $timestamps = true;

    /**
     * Get a setting value by key, with optional default
     */
    public static function get(string $key, $default = null): ?string
    {
        $settings = Cache::remember('app_settings', 300, function () {
            return self::pluck('value', 'key')->toArray();
        });

        return $settings[$key] ?? $default;
    }

    /**
     * Set a setting value (creates or updates)
     */
    public static function set(string $key, ?string $value): void
    {
        self::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
        Cache::forget('app_settings');
    }

    /**
     * Get multiple settings at once
     */
    public static function getMany(array $keys): array
    {
        $settings = Cache::remember('app_settings', 300, function () {
            return self::pluck('value', 'key')->toArray();
        });

        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $settings[$key] ?? null;
        }
        return $result;
    }

    /**
     * Set multiple settings at once
     */
    public static function setMany(array $data): void
    {
        foreach ($data as $key => $value) {
            self::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }
        Cache::forget('app_settings');
    }
}
