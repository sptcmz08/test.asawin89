<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class OptimizeLotteryImages extends Command
{
    protected $signature = 'optimize:lottery-images
        {--width=400 : Max width in pixels}
        {--quality=85 : WebP quality (0-100)}';

    protected $description = 'Convert lottery JFIF images to optimized WebP thumbnails';

    public function handle(): int
    {
        $sourceDir = public_path('images/lottery');
        $outputDir = public_path('images/lottery/optimized');
        $maxWidth = (int) $this->option('width');
        $quality = (int) $this->option('quality');

        if (!is_dir($sourceDir)) {
            $this->error("Source directory not found: {$sourceDir}");
            return 1;
        }

        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        $files = glob($sourceDir . '/*.jfif');
        if (empty($files)) {
            $this->warn('No .jfif files found.');
            return 0;
        }

        $this->info("Processing {$this->count($files)} images → WebP (max {$maxWidth}px, quality {$quality})");
        $bar = $this->output->createProgressBar(count($files));

        $totalBefore = 0;
        $totalAfter = 0;

        foreach ($files as $file) {
            $basename = pathinfo($file, PATHINFO_FILENAME);
            $outputFile = $outputDir . '/' . $basename . '.webp';
            $totalBefore += filesize($file);

            // Load JFIF/JPEG image
            $src = @imagecreatefromjpeg($file);
            if (!$src) {
                $this->newLine();
                $this->warn("  Skipped (cannot read): {$basename}");
                $bar->advance();
                continue;
            }

            // Calculate new dimensions (maintain aspect ratio)
            $origW = imagesx($src);
            $origH = imagesy($src);

            if ($origW > $maxWidth) {
                $newW = $maxWidth;
                $newH = (int) round($origH * ($maxWidth / $origW));
            } else {
                $newW = $origW;
                $newH = $origH;
            }

            // Resize
            $dst = imagecreatetruecolor($newW, $newH);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            imagedestroy($src);

            // Save as WebP
            imagewebp($dst, $outputFile, $quality);
            imagedestroy($dst);

            $totalAfter += filesize($outputFile);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $beforeMB = round($totalBefore / 1048576, 2);
        $afterMB = round($totalAfter / 1048576, 2);
        $savings = $totalBefore > 0 ? round((1 - $totalAfter / $totalBefore) * 100, 1) : 0;

        $this->info("✅ Done! {$beforeMB} MB → {$afterMB} MB ({$savings}% reduction)");
        $this->info("   Output: {$outputDir}");

        return 0;
    }

    private function count(array $arr): int
    {
        return \count($arr);
    }
}
