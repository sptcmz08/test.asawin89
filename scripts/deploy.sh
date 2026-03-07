#!/bin/bash
# Deploy script - รัน scrape ทันทีหลัง deploy

cd /var/www/vhosts/after-spa.com/lotto.after-spa.com

# Pull latest code
git pull

# Clear cache
php artisan cache:clear
php artisan config:clear

# Run scrape immediately
php artisan lottery:auto-scrape --all --calculate

echo "Deploy completed!"
